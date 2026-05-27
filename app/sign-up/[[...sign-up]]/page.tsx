import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft, Trophy } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-md">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            AthleteMatch
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </nav>
        <div className="flex justify-center">
          <SignUp />
        </div>
      </div>
    </main>
  );
}
