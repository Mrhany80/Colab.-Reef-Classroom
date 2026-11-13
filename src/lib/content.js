// Sample classes and real biology content for every module.
const N = {
  'Grade 9 A': 'Adam Bilal Clara Dana Elias Farah Gabriel Hana Idris Jana Karim Layla Malik Nour Omar Petra Qasim Rania Sami Talia Usman Vera Walid Yara',
  'Grade 10 A': 'Omar Yousef Faisal Aisha Bashir Celine Daniel Emma Fahad Ghada Hassan Iman Jad Kenza Leo Mariam Nabil Olivia Rami Salma Tariq Uma Victor Zainab',
  'Grade 11 B': 'Amir Bana Cyrus Dalia Eyad Fatima George Huda Ismail Joud Khalid Lina Majed Nadia Osama Reem Saif Tala Wael Ximena Yazan Zara Noah Mira',
}
const id = () => Math.random().toString(36).slice(2, 10)
export const DEFAULT_SETTINGS = { continuous: 3, ratio: 3, milestones: [{ points: 10, label: 'Sea stars arrive' }, { points: 25, label: 'A school of fish moves in' }, { points: 50, label: 'A sea turtle visits' }, { points: 100, label: 'The reef is in full bloom' }] }
export const sampleClasses = () => Object.entries(N).map(([name, s]) => ({
  id: crypto.randomUUID(), name: name + ' (Sample)', is_sample: true, settings: DEFAULT_SETTINGS,
  students: s.split(' ').map(n => ({ id: id(), name: n })),
}))

export const CONTENT = {
  tps: {
    topic: 'Osmosis',
    question: 'A potato chip is left in very salty water for 30 minutes. It becomes soft and bendy. Explain what happened to the potato cells, using the idea of water potential.',
    stems: ['I think ... because ...', 'Water moves from ... to ...', 'I agree with you about ..., and I would add ...', 'I see it differently because ...'],
  },
  hinge: {
    topic: 'Enzymes',
    question: 'An enzyme from the human stomach is heated to 80 °C, then cooled back to 37 °C. It no longer works. Which statement best explains why?',
    options: [
      { text: 'The heat killed the enzyme.', correct: false, misconception: 'Thinks enzymes are living things. Enzymes are protein molecules; they cannot be killed.' },
      { text: 'The shape of the active site changed permanently, so the substrate no longer fits.', correct: true, misconception: '' },
      { text: 'The substrate molecules changed shape, so they no longer fit the enzyme.', correct: false, misconception: 'Places the change in the substrate instead of the enzyme. Heat denatures the protein.' },
      { text: 'The enzyme was used up in the reaction while it was hot.', correct: false, misconception: 'Thinks enzymes are consumed. Enzymes are catalysts and are not used up.' },
    ],
    reteach: 'Model the active site with two hands cupping a ball. "Heat" bends the fingers apart; cooling does not bend them back. The ball (substrate) has not changed.',
  },
  corners: {
    topic: 'Genetics',
    statement: 'Parents should be allowed to use gene editing to remove an inherited disease, such as cystic fibrosis, from their future child.',
    stems: ['I chose this corner because ...', 'The strongest evidence for my view is ...', 'I partly agree with you, but ...', 'What changed my mind was ...'],
  },
  stw: {
    topic: 'Osmosis', image: '',
    caption: 'Red onion epidermis cells under a light microscope. Left: mounted in distilled water. Right: the same tissue 5 minutes after adding 10% salt solution.',
  },
  kwl: { topic: 'Photosynthesis', prompt: 'How do plants make their own food?' },
  exit: { topic: 'Photosynthesis', subtopics: ['Light and chlorophyll', 'Carbon dioxide and water', 'Glucose and oxygen', 'Limiting factors'] },
  jigsaw: {
    topic: 'Photosynthesis',
    topics: [
      { title: 'Light and chlorophyll', text: 'Chlorophyll is the green pigment inside chloroplasts. It absorbs mainly red and blue light and reflects green light, which is why leaves look green. The absorbed light energy is transferred into chemical energy. Most chloroplasts are in the palisade mesophyll cells near the upper surface of the leaf, where light is strongest.', prompts: ['What does chlorophyll do?', 'Where in the leaf is most of it found, and why there?', 'One key term your home group must know'], q: 'Why do most leaves look green?', options: ['Chlorophyll absorbs green light', 'Chlorophyll reflects green light', 'Green light carries the most energy', 'Chloroplasts produce green light'], answer: 2 },
      { title: 'Carbon dioxide and stomata', text: 'Carbon dioxide enters the leaf by diffusion through small pores called stomata, found mostly on the lower surface. Each stoma is opened and closed by two guard cells. When stomata are open, carbon dioxide diffuses in, but water vapour also diffuses out. In hot, dry conditions the guard cells close the stomata, which saves water but slows photosynthesis.', prompts: ['How does carbon dioxide get into the leaf?', 'What do guard cells do?', 'What is the cost of opening stomata?'], q: 'What happens when a plant closes its stomata on a hot, dry day?', options: ['It loses less water and takes in less carbon dioxide', 'It loses more water and takes in more carbon dioxide', 'It absorbs more light', 'It takes in water through the stomata'], answer: 1 },
      { title: 'Water and the xylem', text: 'Water is absorbed from the soil by root hair cells through osmosis. It travels up the stem to the leaves in xylem vessels, which are hollow tubes of dead cells strengthened with lignin. The pull that moves the water comes from transpiration: as water evaporates from the leaf, more is drawn up behind it. In the leaf, water is a raw material for photosynthesis.', prompts: ['How does water enter the root?', 'What carries water up the plant, and what pulls it?', 'What is the water used for in the leaf?'], q: 'Which tissue carries water from the roots to the leaves?', options: ['Phloem', 'Xylem', 'Palisade mesophyll', 'Epidermis'], answer: 2 },
      { title: 'Glucose and oxygen', text: 'Photosynthesis produces glucose and oxygen. The plant uses glucose for respiration, converts it to starch for storage, to cellulose for cell walls, and combines it with nitrate ions to make amino acids. Sucrose is transported around the plant in the phloem. Oxygen is a by-product: some is used in respiration and the rest diffuses out through the stomata.', prompts: ['What are the two products?', 'List three things the plant does with glucose', 'What happens to the oxygen?'], q: 'In what form do plants usually store the glucose they make?', options: ['Starch', 'Cellulose', 'Oxygen', 'Chlorophyll'], answer: 1 },
    ],
  },
  cer: {
    topic: 'Osmosis',
    question: 'Potato cylinders were weighed, left in sucrose solutions for 40 minutes, and weighed again. At what sucrose concentration is the solution isotonic with potato cells?',
    table: 'Sucrose concentration (mol/dm³), Start mass (g), End mass (g), Change in mass (%)\n0.0, 2.44, 2.64, +8.2\n0.2, 2.58, 2.66, +3.1\n0.4, 2.51, 2.47, -1.6\n0.6, 2.49, 2.34, -6.0\n0.8, 2.55, 2.30, -9.8\n1.0, 2.48, 2.18, -12.1',
    image: '',
    starters: ['The data show that ...', 'This supports our claim because ...', 'Water moved by osmosis from ... to ...', 'The change in mass is zero when ..., which means ...'],
  },
  gallery: {
    topic: 'Enzymes',
    prompts: ['Explain the lock-and-key model of enzyme action', 'How does temperature affect enzyme activity?', 'How does pH affect enzyme activity?', 'Where are enzymes used in the digestive system?', 'How are enzymes used in industry and at home?', 'What happens when an enzyme is denatured?'],
  },
  stations: {
    topic: 'Enzymes',
    stations: [
      { name: 'Catalase and hydrogen peroxide', task: 'Add a cube of raw liver or potato to 5 cm³ of hydrogen peroxide. Measure the height of the foam after 30 seconds.', checklist: ['Safety glasses on', 'Measured 5 cm³ of hydrogen peroxide', 'Recorded foam height in mm', 'Wrote one sentence explaining the foam'] },
      { name: 'Amylase and temperature', task: 'Test starch and amylase at 20 °C and 40 °C. Use iodine every 30 seconds to find when the starch has gone.', checklist: ['Set up both water baths', 'Tested with iodine every 30 seconds', 'Recorded the time for each temperature', 'Compared the two rates'] },
      { name: 'Reading a pH graph', task: 'Use the graph of pepsin and trypsin activity against pH. Find the optimum pH for each enzyme.', checklist: ['Found the optimum pH for pepsin', 'Found the optimum pH for trypsin', 'Explained why they differ', 'Linked each enzyme to a part of the gut'] },
      { name: 'Build the model', task: 'Use modelling clay to build an enzyme, its substrate and the enzyme-substrate complex. Then show a denatured enzyme.', checklist: ['Built enzyme and substrate that fit', 'Showed the enzyme-substrate complex', 'Showed the products leaving', 'Showed the denatured active site'] },
    ],
  },
  nht: {
    topic: 'Genetics',
    questions: [
      { q: 'Two parents are both heterozygous (Bb) for brown eyes, where B is dominant. What is the probability that their child has blue eyes (bb)?', options: ['0%', '25%', '50%', '75%'], answer: 2 },
      { q: 'Which term describes the alleles an organism has for a gene, for example Bb?', options: ['Phenotype', 'Genotype', 'Chromosome', 'Gamete'], answer: 2 },
      { q: 'A man with blood group AB and a woman with blood group O have a child. Which blood groups are possible?', options: ['A or B', 'AB only', 'O only', 'A, B, AB or O'], answer: 1 },
    ],
  },
  cmap: {
    topic: 'Photosynthesis',
    focus: 'How does a plant make and use glucose?',
    concepts: ['Light', 'Chlorophyll', 'Chloroplast', 'Carbon dioxide', 'Water', 'Glucose', 'Oxygen', 'Stomata', 'Starch', 'Respiration'],
    phrases: ['produces', 'is needed for', 'is absorbed by', 'is found in', 'enters through', 'is stored as', 'is used in', 'is released through'],
    expert: [
      { from: 'Light', phrase: 'is absorbed by', to: 'Chlorophyll' },
      { from: 'Chlorophyll', phrase: 'is found in', to: 'Chloroplast' },
      { from: 'Carbon dioxide', phrase: 'enters through', to: 'Stomata' },
      { from: 'Carbon dioxide', phrase: 'is needed for', to: 'Glucose' },
      { from: 'Water', phrase: 'is needed for', to: 'Glucose' },
      { from: 'Chloroplast', phrase: 'produces', to: 'Glucose' },
      { from: 'Chloroplast', phrase: 'produces', to: 'Oxygen' },
      { from: 'Oxygen', phrase: 'is released through', to: 'Stomata' },
      { from: 'Glucose', phrase: 'is stored as', to: 'Starch' },
      { from: 'Glucose', phrase: 'is used in', to: 'Respiration' },
      { from: 'Oxygen', phrase: 'is used in', to: 'Respiration' },
    ],
  },
}
