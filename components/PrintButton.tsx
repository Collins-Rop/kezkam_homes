'use client';

export default function PrintButton({ label = 'Print / Export' }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      {label}
    </button>
  );
}
