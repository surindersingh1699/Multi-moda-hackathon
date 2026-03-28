import type { Category } from "@/lib/schema";
import {
  DoodlePillow,
  DoodleLamp,
  DoodleFrame,
  DoodlePlant,
  DoodleAccessory,
} from "@/components/DoodleElements";

const ICON_MAP: Record<Category, React.ComponentType<{ className?: string }>> = {
  textiles: DoodlePillow,
  lighting: DoodleLamp,
  wall_decor: DoodleFrame,
  plants: DoodlePlant,
  accessories: DoodleAccessory,
  furniture: DoodlePillow, // reuse pillow for furniture (closest match)
};

export function DecoratorIcon({
  category,
  className = "w-8 h-8",
}: {
  category: Category;
  className?: string;
}) {
  const Icon = ICON_MAP[category];
  return <Icon className={className} />;
}
