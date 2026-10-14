const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

export const MEDIA = {
  hero: px(28406043, 1800, 1100),
  heroTall: px(16125025, 1000, 1250),
  atelier: px(33315959, 1200, 900),
  texture: px(31034512, 1400, 900),
  spotlight: px(16125025, 1000, 1200),
} as const;
