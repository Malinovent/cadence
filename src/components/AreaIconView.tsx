import type React from "react";
import {
  Baby,
  BedDouble,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  Code,
  Coffee,
  Dumbbell,
  Gamepad2,
  Heart,
  House,
  Leaf,
  Moon,
  Music,
  Palette,
  PawPrint,
  PenLine,
  Plane,
  ShoppingCart,
  Sparkles,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { isAreaIcon, type AreaIcon } from "../lib/icons";
import { S } from "../styles";

const ICONS: Record<AreaIcon, LucideIcon> = {
  moon: Moon,
  bed: BedDouble,
  briefcase: Briefcase,
  users: Users,
  heart: Heart,
  dumbbell: Dumbbell,
  bike: Bike,
  book: BookOpen,
  brain: Brain,
  palette: Palette,
  music: Music,
  home: House,
  leaf: Leaf,
  coffee: Coffee,
  utensils: Utensils,
  cart: ShoppingCart,
  code: Code,
  pen: PenLine,
  camera: Camera,
  gamepad: Gamepad2,
  baby: Baby,
  paw: PawPrint,
  plane: Plane,
  sparkles: Sparkles,
};

/** An area's icon in its colour (line icons, bundled: works offline). Nothing when it has none. */
export function AreaIconView({
  icon,
  size = 15,
  style,
}: {
  icon?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  if (!isAreaIcon(icon)) return null;
  const Icon = ICONS[icon];
  return <Icon size={size} strokeWidth={2} aria-hidden="true" focusable={false} style={{ flexShrink: 0, ...style }} />;
}

/** The area's icon, or its colour dot when it has none. */
export function AreaMark({ icon, color, size = 15 }: { icon?: string; color: string; size?: number }) {
  return isAreaIcon(icon) ? (
    <AreaIconView icon={icon} size={size} style={{ color }} />
  ) : (
    <span aria-hidden="true" style={{ ...S.dot, background: color, flexShrink: 0 }} />
  );
}
