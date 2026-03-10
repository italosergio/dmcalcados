# 🔥 Configuração Firebase - Passo a Passo

## ✅ Checklist Obrigatório:

### 1. Habilitar Authentication
```
1. Acesse: https://console.firebase.google.com/project/dmcalcados/authentication
2. Clique "Get Started" (se aparecer)
3. Aba "Sign-in method"
4. Clique em "Email/Password"
5. HABILITE o primeiro toggle
6. Clique "Save"
```

### 2. Criar Realtime Database
```
1. Acesse: https://console.firebase.google.com/project/dmcalcados/database
2. Clique "Create Database"
3. Escolha localização: United States (us-central1)
4. Escolha "Start in test mode"
5. Enable
```

### 3. Configurar Regras do Realtime Database
```
1. Vá na aba "Rules"
2. Cole o conteúdo do arquivo database.rules.json
3. Clique "Publish"
```

### 4. Verificar .env
```
VITE_FIREBASE_API_KEY=AIzaSyCiRNZ3HxWOTjXNNxniWYTViUWpwp6Pspg
VITE_FIREBASE_AUTH_DOMAIN=dmcalcados.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dmcalcados
VITE_FIREBASE_STORAGE_BUCKET=dmcalcados.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=754193678959
VITE_FIREBASE_APP_ID=1:754193678959:web:70b95c5eff1aeb80eac39a
VITE_FIREBASE_DATABASE_URL=https://dmcalcados-default-rtdb.firebaseio.com
```

### 5. Reiniciar servidor
```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🎯 Testar:

1. Acesse: http://localhost:5173/register
2. Crie usuário: username, senha (6+ caracteres), nome
3. Se der erro 400, volte ao passo 1 (Authentication não habilitado)

## ⚠️ Erro 400 = Authentication não habilitado!
