export interface AreaColor {
  gradient: string;
  border: string;
  hoverBorder: string;
  text: string;
  chevron: string;
  chevronHover: string;
  shadow: string;
  bg: string;
}

const palette: AreaColor[] = [
  { gradient: 'from-blue-500 to-blue-600',       border: 'border-blue-300',    hoverBorder: 'hover:border-blue-500',    text: 'text-blue-600',    chevron: 'text-blue-400',    chevronHover: 'group-hover:text-blue-600',    shadow: 'hover:shadow-blue-300',    bg: 'bg-blue-100' },
  { gradient: 'from-emerald-500 to-emerald-600', border: 'border-emerald-300',  hoverBorder: 'hover:border-emerald-500', text: 'text-emerald-600', chevron: 'text-emerald-400',  chevronHover: 'group-hover:text-emerald-600',  shadow: 'hover:shadow-emerald-300',  bg: 'bg-emerald-100' },
  { gradient: 'from-amber-500 to-amber-600',     border: 'border-amber-300',   hoverBorder: 'hover:border-amber-500',   text: 'text-amber-600',  chevron: 'text-amber-400',   chevronHover: 'group-hover:text-amber-600',   shadow: 'hover:shadow-amber-300',   bg: 'bg-amber-100' },
  { gradient: 'from-rose-500 to-rose-600',       border: 'border-rose-300',    hoverBorder: 'hover:border-rose-500',   text: 'text-rose-600',   chevron: 'text-rose-400',   chevronHover: 'group-hover:text-rose-600',   shadow: 'hover:shadow-rose-300',   bg: 'bg-rose-100' },
  { gradient: 'from-cyan-500 to-cyan-600',       border: 'border-cyan-300',    hoverBorder: 'hover:border-cyan-500',    text: 'text-cyan-600',   chevron: 'text-cyan-400',   chevronHover: 'group-hover:text-cyan-600',   shadow: 'hover:shadow-cyan-300',   bg: 'bg-cyan-100' },
  { gradient: 'from-violet-500 to-violet-600',  border: 'border-violet-300',  hoverBorder: 'hover:border-violet-500', text: 'text-violet-600', chevron: 'text-violet-400', chevronHover: 'group-hover:text-violet-600', shadow: 'hover:shadow-violet-300', bg: 'bg-violet-100' },
  { gradient: 'from-orange-500 to-orange-600',   border: 'border-orange-300',  hoverBorder: 'hover:border-orange-500', text: 'text-orange-600', chevron: 'text-orange-400', chevronHover: 'group-hover:text-orange-600', shadow: 'hover:shadow-orange-300', bg: 'bg-orange-100' },
  { gradient: 'from-teal-500 to-teal-600',       border: 'border-teal-300',    hoverBorder: 'hover:border-teal-500',    text: 'text-teal-600',   chevron: 'text-teal-400',   chevronHover: 'group-hover:text-teal-600',   shadow: 'hover:shadow-teal-300',   bg: 'bg-teal-100' },
];

const slugMap: Record<string, number> = {
  'ventas-0km': 0,
  'plan-rombo': 1,
  'mi-auto-ya': 2,
  'postventa': 3,
  'calidad': 4,
  'rrhh': 5,
  'admn-finanzas': 6,
};

export function getAreaColor(slug: string, index = 0): AreaColor {
  return palette[slugMap[slug] ?? index % palette.length];
}
