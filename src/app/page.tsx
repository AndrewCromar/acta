import { SyncRunner } from "@/components/SyncRunner";
import { TodoArea } from "@/components/TodoArea";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col w-full pb-[calc(env(safe-area-inset-bottom)+2rem)] font-[family-name:var(--font-geist-sans)]">
      <SyncRunner />
      <TodoArea />
    </main>
  );
}
