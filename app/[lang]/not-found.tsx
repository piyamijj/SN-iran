import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <h1 className="text-3xl font-extrabold">404</h1>
      <p className="mt-2 text-muted-foreground">Not found · پیدا نشد · Bulunamadı</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 font-semibold text-white">←</Link>
    </div>
  );
}
