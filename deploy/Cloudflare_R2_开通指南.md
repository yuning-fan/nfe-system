# Cloudflare R2 开通与取凭证指南

> 目标：开通 R2、建好 5 个桶、拿到 3 个凭证（Account ID + Access Key ID + Secret Access Key）、配好 CORS。
> 全程网页操作。免费额度：10GB 存储 + 出流量免费，额度内不扣费。

---

## 一、注册 / 登录并开通 R2

1. 打开 https://dash.cloudflare.com 注册或登录
2. 左侧菜单找到 **R2 Object Storage**（或 **R2**）点进去
3. 首次使用会提示订阅 R2：
   - 点 **Purchase R2 Plan / Subscribe**
   - **需要绑定一张信用卡**（这是 Cloudflare 的验证要求；免费额度 10GB 内不会扣费）
   - 选 **Free** 套餐即可

---

## 二、创建 5 个存储桶（Bucket）

在 R2 页面点 **Create bucket**，依次建以下 5 个（名字要完全一致，方便代码对应）：

| 桶名 | 用途 | 公开/私有 |
|---|---|---|
| `student-docs` | 护照、签证、保险、监护协议 | **私有**（敏感） |
| `materials` | 课件 | 私有 |
| `reports` | PDF 报告 | 私有 |
| `avatars` | 头像 | 可公开（不敏感） |
| `resources` | 资料库 | 私有 |

**创建时的选项：**
- **Bucket name**：填上面的名字
- **Location**：选 **Automatic** 或 **Asia-Pacific (APAC)**（离新西兰近）
- 其他默认，点 **Create bucket**

> 私有/公开不用在创建时纠结——默认就是私有。我们的方案对所有桶都用「预签名URL」访问，不需要开公开访问。`avatars` 以后想公开也能单独开。

---

## 三、取凭证（最关键的一步）

### ① Account ID（账户ID）
- 在 R2 总览页面，**右侧**会显示 **Account ID**，长这样：`a1b2c3d4e5f6...`（32位）
- 或者任意桶的 **Settings → S3 API** 里能看到 endpoint：
  `https://<这串就是AccountID>.r2.cloudflarestorage.com`
- 复制这串 → 这是要给我的第 1 个凭证

### ② + ③ Access Key ID 和 Secret Access Key
1. 在 R2 页面点右上角 **Manage R2 API Tokens**（或 **API → Manage API Tokens**）
2. 点 **Create API Token**（或 Create Account API Token）
3. 配置：
   | 字段 | 选什么 |
   |---|---|
   | **Token name** | `nfe-upload`（任意） |
   | **Permissions** | **Object Read & Write**（读写对象） |
   | **Specify bucket(s)** | 选 **Apply to all buckets** 或手动勾选上面5个桶 |
   | **TTL** | 选 **Forever**（永久，或按需设到期） |
4. 点 **Create API Token**
5. 创建成功后页面会显示：
   - **Access Key ID**：一串字符 → 第 2 个凭证
   - **Secret Access Key**：一串更长的字符 → 第 3 个凭证
   - ⚠️ **Secret Access Key 只显示这一次！** 必须立刻复制保存，刷新页面就再也看不到了（丢了只能删 token 重建）

---

## 四、配置 CORS（允许前端直传）

> 不配 CORS，浏览器会拦截直传请求。每个桶都要配，或者先配 `student-docs` 和 `avatars` 跑通再配其余。

1. 进入某个桶 → **Settings** → 找到 **CORS Policy** → **Add CORS policy / Edit**
2. 粘贴下面的 JSON（`AllowedOrigins` 已包含你的 Vercel 域名和本地开发地址）：

```json
[
  {
    "AllowedOrigins": [
      "https://nfe-admin-web.vercel.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. 保存。对 5 个桶重复（至少先配 `student-docs`、`avatars`、`materials`）。

> 以后绑了自定义域名，记得把新域名加进 `AllowedOrigins`。

---

## 五、把凭证发我（格式参考）

```
R2 Account ID:        
R2 Access Key ID:     
R2 Secret Access Key: 
```

发我后我会：
1. 把这 3 个凭证设为 Supabase Edge Function 的密钥（不进前端、不进代码仓库）
2. 部署签名服务 + 前端上传组件
3. 联调上传/下载

---

## ⚠️ 安全提醒
- **Secret Access Key 等同于桶的钥匙**，只发我用于本次部署配置。
- 配置完成后，这串 Secret 只存在于 Supabase 后台的环境变量里，不会出现在前端代码或 Git 仓库。
- 如担心对话泄露，部署联调通过后可在 R2 删除此 token 再重建一个、更新到 Supabase 即可。
