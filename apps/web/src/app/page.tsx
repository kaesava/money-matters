"use client";
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  // Placeholder Auth simulation
  const handleSignIn = () => {
     // Ideally using Neon Auth hooks here
     router.push('/dashboard');
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans min-h-screen p-8 dark:bg-black">
      <main className="max-w-2xl bg-white dark:bg-zinc-900 p-12 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-800 flex flex-col gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome to money
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400">
          The forward-looking income allocation system engineered for absolute financial clarity without administrative friction.
        </p>
        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full pt-4">
           <button 
             onClick={handleSignIn}
             className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg py-3 px-4 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
           >
             Sign In / Register
           </button>
           <p className="text-sm text-zinc-500 dark:text-zinc-400">
             Start managing your money at the exact point of income arrival.
           </p>
        </div>
      </main>
    </div>
  );
}
