import type { OwnedPet, PetDailyFact, PetId } from './pet-domain.types';

type FactDefinition = Omit<PetDailyFact, 'day'>;

const catWhiskers = {
  sourceName: 'Cats Protection',
  sourceUrl: 'https://www.cats.org.uk/cats-blog/why-do-cats-have-whiskers'
};
const catEars = {
  sourceName: 'Cats Protection',
  sourceUrl: 'https://www.cats.org.uk/media/4573/039-thecat_summer20-five-facts.pdf'
};
const catSleep = {
  sourceName: 'Cats Protection',
  sourceUrl: 'https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-and-sleep'
};
const catPurr = { sourceName: 'Cats Protection', sourceUrl: 'https://www.cats.org.uk/cats-blog/why-does-my-cat-purr' };
const dogs = { sourceName: 'PDSA', sourceUrl: 'https://www.pdsa.org.uk/what-we-do/blog/10-amazing-facts-about-dogs' };
const dogVision = {
  sourceName: 'VCA Animal Hospitals',
  sourceUrl: 'https://vcahospitals.com/pediatric/puppy/behavior-training/how-well-do-you-know-your-puppy'
};
const parrots = { sourceName: 'San Diego Zoo', sourceUrl: 'https://animals.sandiegozoo.org/animals/parrot' };
const macaws = { sourceName: 'San Diego Zoo', sourceUrl: 'https://animals.sandiegozoo.org/animals/macaw' };
const kakapo = {
  sourceName: 'Department of Conservation',
  sourceUrl: 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/kakapo/'
};
const stegosaurus = {
  sourceName: 'Natural History Museum',
  sourceUrl: 'https://www.nhm.ac.uk/discover/dino-directory/Stegosaurus.html'
};
const diplodocus = {
  sourceName: 'Natural History Museum',
  sourceUrl: 'https://www.nhm.ac.uk/discover/dino-directory/diplodocus.html'
};
const triceratops = {
  sourceName: 'Natural History Museum',
  sourceUrl: 'https://www.nhm.ac.uk/discover/dino-directory/triceratops.html'
};
const iguanodon = {
  sourceName: 'Natural History Museum',
  sourceUrl: 'https://www.nhm.ac.uk/discover/dino-directory/iguanodon.html'
};

// Stable rotation order. Localized text for these IDs lives in translations.ts.
// Sources and wording checked 2026-10-04; see docs/specs/daily-animal-facts.md.
const FACTS = {
  cat: [
    { id: 'catFact1', ...catWhiskers },
    { id: 'catFact2', ...catEars },
    { id: 'catFact3', ...catSleep },
    { id: 'catFact4', ...catWhiskers },
    { id: 'catFact5', ...catEars },
    { id: 'catFact6', ...catPurr },
    { id: 'catFact7', ...catSleep },
    { id: 'catFact8', ...catWhiskers }
  ],
  dog: [
    { id: 'dogFact1', ...dogs },
    { id: 'dogFact2', ...dogVision },
    { id: 'dogFact3', ...dogs },
    { id: 'dogFact4', ...dogs },
    { id: 'dogFact5', ...dogs },
    { id: 'dogFact6', ...dogs },
    { id: 'dogFact7', ...dogs },
    { id: 'dogFact8', ...dogs }
  ],
  parrot: [
    { id: 'parrotFact1', ...parrots },
    { id: 'parrotFact2', ...kakapo },
    { id: 'parrotFact3', ...macaws },
    { id: 'parrotFact4', ...parrots },
    { id: 'parrotFact5', ...macaws },
    { id: 'parrotFact6', ...parrots },
    { id: 'parrotFact7', ...macaws },
    { id: 'parrotFact8', ...parrots }
  ],
  dinosaur: [
    { id: 'dinosaurFact1', ...triceratops },
    { id: 'dinosaurFact2', ...stegosaurus },
    { id: 'dinosaurFact3', ...diplodocus },
    { id: 'dinosaurFact4', ...iguanodon },
    { id: 'dinosaurFact5', ...triceratops },
    { id: 'dinosaurFact6', ...stegosaurus },
    { id: 'dinosaurFact7', ...diplodocus },
    { id: 'dinosaurFact8', ...iguanodon }
  ]
} as const satisfies Record<Exclude<PetId, 'dragon'>, readonly FactDefinition[]>;

export function petDailyFact(pet: Pick<OwnedPet, 'petId' | 'status'>, now: Date): PetDailyFact | null {
  if (pet.status !== 'pet' || pet.petId === 'dragon') return null;
  const facts = FACTS[pet.petId];
  const utcDay = Math.floor(now.getTime() / 86_400_000);
  const index = ((utcDay % facts.length) + facts.length) % facts.length;
  return { ...facts[index], day: now.toISOString().slice(0, 10) };
}
