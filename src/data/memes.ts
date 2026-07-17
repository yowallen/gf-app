export type MemeTag = 'us' | 'psych major' | 'garden' | 'chaos'

export type Meme = {
  id: string
  caption: string
  tag: MemeTag
  /** Optional path under /public, e.g. /memes/coffee.png */
  image?: string
  alt?: string
  /** Shown when no image — short whimsical placeholder */
  placeholder?: string
}

export const memeTags: Array<MemeTag | 'All'> = [
  'All',
  'us',
  'psych major',
  'garden',
  'chaos',
]

export const memes: Meme[] = [
  {
    id: 'm1',
    caption:
      'Me explaining my attachment style vs. me when you text “omw”.',
    tag: 'psych major',
    placeholder: 'secure? with you, yes',
  },
  {
    id: 'm2',
    caption:
      'Green pastures? Check. Flowers? Check. You in the middle of it? Required.',
    tag: 'garden',
    placeholder: 'meadow energy',
  },
  {
    id: 'm3',
    caption:
      'Therapist: “and how does that make you feel?” Me: [sends this meme].',
    tag: 'psych major',
    placeholder: 'case study: us',
  },
  {
    id: 'm4',
    caption:
      'Our group chat energy if the group chat was just the two of us and chaos.',
    tag: 'chaos',
    placeholder: 'brainrot garden',
  },
  {
    id: 'm5',
    caption:
      'Plot twist: the love language was “sending unhinged memes at 1am”.',
    tag: 'us',
    placeholder: 'words of memery',
  },
  {
    id: 'm6',
    caption:
      'If dopamine had a garden, it would look like our inside jokes blooming.',
    tag: 'garden',
    placeholder: 'serotonin petals',
  },
]
