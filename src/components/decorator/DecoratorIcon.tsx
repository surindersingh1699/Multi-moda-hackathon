import {
  DoodlePillow,
  DoodleLamp,
  DoodleFrame,
  DoodlePlant,
  DoodleAccessory,
} from "@/components/DoodleElements";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  textiles: DoodlePillow,
  lighting: DoodleLamp,
  wall_decor: DoodleFrame,
  plants: DoodlePlant,
  accessories: DoodleAccessory,
  furniture: DoodlePillow,
};

export function DecoratorIcon({
  category,
  className = "w-8 h-8",
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICON_MAP[category] ?? DoodlePillow;
  return <Icon className={className} />;
}
