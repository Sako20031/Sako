// Sample photography. Every visual on the site goes through this map or the
// admin-editable content, so photos can be replaced without touching code.
//
// Photos are illustrative stock images from Unsplash (Unsplash License), not
// completed company projects. Replace them with real work in the admin panel.

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=80`;

export const images = {
  hero: unsplash('1600210492486-724fe5c67fb0'),
  matte: unsplash('1600607687939-ce8a6c25118c'),
  glossy: unsplash('1600566753190-17f0baa2a6c3'),
  satin: unsplash('1616594039964-ae9021a400a0'),
  shadow: unsplash('1618220179428-22790b461013'),
  floating: unsplash('1615874959474-d609969a20ed'),
  lines: unsplash('1497366811353-6870744d04b2'),
  multilevel: unsplash('1600573472550-8090b5e0745e'),
  curtain: unsplash('1616486338812-3dadae4b4ace'),
  integrated: unsplash('1600566753086-00f18fb6b3ea'),
  decorative: unsplash('1617806118233-18e1de247200'),
  kitchen: unsplash('1556909114-f6e7ad7d3136'),
  kitchen2: unsplash('1556911220-bff31c812dba'),
  bathroom: unsplash('1584622650111-993a426fbf0a'),
  bathroom2: unsplash('1552321554-5fefe8c9ef14'),
  bedroom: unsplash('1505693416388-ac5ce068fe85'),
  living: unsplash('1618221195710-dd6b41faaea6'),
  living2: unsplash('1586023492125-27b2c045efd7'),
  living3: unsplash('1502672260266-1c1ef2d93688'),
  office: unsplash('1497366216548-37526070297c'),
  apartment: unsplash('1522708323590-d24dbb6b0267'),
  lamp: unsplash('1513694203232-719a280e022f'),
  about: unsplash('1600585154340-be6161a56a0c'),
} as const;
