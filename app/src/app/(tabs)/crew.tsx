import { UsersIcon } from '@/components/icons';
import { ComingSoon } from '@/components/coming-soon';
import { colors } from '@/theme';

export default function CrewTab() {
  return (
    <ComingSoon
      overline="MY GROUPS"
      title="Your crew"
      body="Make a group for each circle, invite friends with a link, and choose what each group sees. Then CrewJio finds the days you’re all off."
      icon={<UsersIcon size={28} color={colors.teal} />}
    />
  );
}
