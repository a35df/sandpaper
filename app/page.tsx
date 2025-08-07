import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default async function HomePage() {
  const { data: latestEpisode, error } = await supabase
    .from('episodes')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const startHref = latestEpisode ? `/episodes/${latestEpisode.id}` : '/episodes/new';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-5xl font-bold mb-4">draft_sandpaper</h1>
      <p className="text-xl text-gray-400 mb-8">
        AI-powered writing assistant for webnovel authors
      </p>
      <Link
        href={startHref}
        className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Start Writing
      </Link>
    </div>
  );
}
