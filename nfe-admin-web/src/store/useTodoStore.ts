import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export interface Todo {
  id: number;
  content: string;
  created_by: string;
  collaborator_ids: string[];
  due_at: string | null;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
}

export interface StaffOption { id: string; full_name: string }

interface TodoStore {
  todos: Todo[];
  staff: StaffOption[];
  isLoading: boolean;
  fetchTodos: () => Promise<void>;
  fetchStaff: () => Promise<void>;
  addTodo: (content: string, dueAt: string | null, collaboratorIds: string[]) => Promise<boolean>;
  toggleDone: (id: number, isDone: boolean) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  staff: [],
  isLoading: false,

  fetchTodos: async () => {
    set({ isLoading: true });
    try {
      // RLS 已限定为「自己创建 或 被列为协作者」，直接查全部即可
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('is_done', { ascending: true })
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ todos: (data as Todo[]) || [], isLoading: false });
    } catch (err) {
      console.error('fetchTodos error', err);
      set({ isLoading: false });
    }
  },

  fetchStaff: async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .neq('role', 'student')
        .order('full_name');
      set({ staff: (data as StaffOption[]) || [] });
    } catch (err) {
      console.error('fetchStaff error', err);
    }
  },

  addTodo: async (content, dueAt, collaboratorIds) => {
    try {
      const user = useAuthStore.getState().user;
      const { error } = await supabase.from('todos').insert({
        content,
        created_by: user?.id,
        due_at: dueAt || null,
        collaborator_ids: collaboratorIds,
      });
      if (error) throw error;
      await get().fetchTodos();
      return true;
    } catch (err) {
      console.error('addTodo error', err);
      return false;
    }
  },

  toggleDone: async (id, isDone) => {
    try {
      const { error } = await supabase.from('todos')
        .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
      await get().fetchTodos();
    } catch (err) {
      console.error('toggleDone error', err);
    }
  },

  deleteTodo: async (id) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      await get().fetchTodos();
    } catch (err) {
      console.error('deleteTodo error', err);
    }
  },
}));
