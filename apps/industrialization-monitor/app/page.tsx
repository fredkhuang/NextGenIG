/* eslint-disable @next/next/no-img-element -- brand SVGs are static assets */

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16 sm:px-8">
      <img src="/horizontal-small-color.svg" alt="NextGen Industry" className="h-10 w-auto self-start dark:hidden" />
      <img src="/horizontal-small-white.svg" alt="NextGen Industry" className="hidden h-10 w-auto self-start dark:block" />
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl text-primary">Startup Industrialization Monitor</h1>
        <p className="text-muted">
          Tracking startup factory and pilot sites under development in the United States.
        </p>
      </div>
    </main>
  );
}
