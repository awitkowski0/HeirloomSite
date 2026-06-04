import { useContent } from '../useContent';
import ShowroomSlideshow from '../components/showroom/ShowroomSlideshow';
import FeaturedGrid from '../components/showroom/FeaturedGrid';
import JourneyTimeline from '../components/showroom/JourneyTimeline';

export default function Showroom() {
  const { inventory, showroom, loading } = useContent();

  if (loading) return null;

  return (
    <div>
      <ShowroomSlideshow slides={showroom?.slides || []} inventory={inventory} />
      <FeaturedGrid
        featured={showroom?.featured || []}
        inventory={inventory}
      />
      <JourneyTimeline />
    </div>
  );
}
