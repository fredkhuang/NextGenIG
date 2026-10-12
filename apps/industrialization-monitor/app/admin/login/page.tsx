/* eslint-disable @next/next/no-img-element -- brand SVGs are static assets */
import { Suspense } from "react";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  "not-admin": "That account isn't on the admin list.",
  link: "That sign-in link is invalid or expired. Request a new one.",
};

async function ErrorNotice({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return message ? <p className="rounded-md bg-support-subtle px-3 py-2 text-sm">{message}</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <img src="/horizontal-small-color.svg" alt="NextGen Industry" className="h-9 w-auto self-start dark:hidden" />
      <img src="/horizontal-small-white.svg" alt="NextGen Industry" className="hidden h-9 w-auto self-start dark:block" />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl text-primary">Admin sign in</h1>
        <p className="text-muted">Startup Industrialization Monitor</p>
      </div>
      <Suspense>
        <ErrorNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
