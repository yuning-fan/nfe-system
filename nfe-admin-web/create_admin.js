import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const email = 'admin@nfe.com'
  const password = 'Password123!'
  
  // 1. Create User in Auth
  console.log(`Creating user: ${email}...`)
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError) {
    if (userError.message.includes('already exists')) {
      console.log('User already exists, updating profile role to admin instead.')
      // Fetch user ID
      const { data: usersData } = await supabase.auth.admin.listUsers()
      const existingUser = usersData.users.find(u => u.email === email)
      if (existingUser) {
        await setAdminRole(existingUser.id)
      }
      return
    }
    console.error('Error creating user:', userError)
    return
  }
  
  console.log('User created:', user.user.id)
  await setAdminRole(user.user.id)
}

async function setAdminRole(userId) {
  // 2. The profile is automatically created via the Postgres trigger `on_auth_user_created`
  // We need to update the role to 'admin' and set a name.
  console.log(`Updating profile for user ${userId} to admin...`)
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      role: 'admin', 
      full_name: '系统管理员' 
    })
    .eq('id', userId)
    
  if (error) {
    console.error('Error updating profile:', error)
  } else {
    console.log('Admin account setup complete!')
  }
}

main()
