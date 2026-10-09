import { AirplaneTiltIcon, HeartIcon } from '@/components/icons';
import { ComingSoon } from '@/components/coming-soon';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

export default function PartnerTab() {
  const { profile } = useAuth();
  if (profile?.role === 'pilot') {
    return (
      <ComingSoon
        overline="PARTNER"
        title="Your partner"
        body="Connect with your partner to share your full roster, see when they land, and find your next day together."
        icon={<HeartIcon size={28} color={colors.pink} />}
      />
    );
  }
  return (
    <ComingSoon
      overline="TRACK"
      title="Live flights"
      body="Follow your flights and your partner’s, with landing alerts and a share link for family."
      icon={<AirplaneTiltIcon size={28} color={colors.amber} />}
    />
  );
}
