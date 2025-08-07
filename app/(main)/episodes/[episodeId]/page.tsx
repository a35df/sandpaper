import EpisodeEditor from '@/components/editor/EpisodeEditor';
import { Episode } from '@/types';
import { supabase } from '@/lib/supabase';

async function getEpisode(id: string): Promise<Episode | null> {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*, paragraphs(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }
    
    // paragraphs를 order 순으로 정렬
    if (data && data.paragraphs) {
      data.paragraphs.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    }

    return data as Episode | null;
  } catch (error) {
    console.error('Error fetching episode directly from Supabase:', error);
    return null;
  }
}

const EpisodePage = async ({ params }: { params: { episodeId: string } }) => {
  // A simple way to handle potential new episodes
  if (params.episodeId === 'new') {
    return (
      <main>
        <EpisodeEditor isNew />
      </main>
    );
  }
  
  const episode = await getEpisode(params.episodeId);

  if (!episode) {
    return <div className="text-center p-8">에피소드를 찾을 수 없거나 불러오는 데 실패했습니다.</div>;
  }

  return (
    <main>
      <EpisodeEditor initialEpisode={episode} />
    </main>
  );
};

export default EpisodePage;
