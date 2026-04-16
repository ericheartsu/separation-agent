import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="p-12 text-center">
      <div className="text-6xl font-bold text-craft-cyan">404</div>
      <p className="text-gray-400 mt-2">Page not found.</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">Back home</Link>
    </div>
  );
}
