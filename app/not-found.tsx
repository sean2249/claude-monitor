import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Session not found.</p>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
