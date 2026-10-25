import QuestGenerator from "@/components/QuestGenerator";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">Quest Generator</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A random QuestGo adventure for two. Complete it, then upload a photo to prove it.
        </p>
      </div>
      <QuestGenerator />
    </main>
  );
}
