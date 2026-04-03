import { LoginForm } from '~/components/auth/LoginForm';

export function meta() {
  return [
    { title: 'Entrar — DM Calçados' },
  ];
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: 'url(/home-background.png)' }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
