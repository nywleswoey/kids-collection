# A longlist of the world's spirits, ghosts and hauntings worth carding

Findings for [#144](https://github.com/nywleswoey/kids-collection/issues/144), on map
[#143](https://github.com/nywleswoey/kids-collection/issues/143). **This file picks nothing and ranks
nothing.** It is a candidate roster wide enough that choosing 30 becomes a matter of taste rather than of
what could be found. The 30 subjects, their rarities, the treatment rules for the death-and-underworld
figures and the card-name convention are #143's spec, downstream of here.

Read on **2026-08-31**. Sources are English Wikipedia throughout — acceptable for this domain per #144 —
and **every URL below was fetched and returned `200`**. Where a figure had no dedicated article it was
dropped rather than sourced to a list entry; those drops are named in §5.

---

## 1. How to read the three flags

**Practice.** `folklore` = survives as story only. `living practice` = people currently believe in it,
venerate it, or make offerings to it. This is the flag that feeds the separate treatment ticket, and it
lands on far more of the roster than a Western reading would expect: most of the Chinese underworld
bureaucracy, most Korean household gods, and nearly all the Southeast Asian entries are **live religion,
not dead myth**. A card that treats them as fun ghosts is making a claim about somebody's faith.

**Image-lane failure class**, from the per-provider table in `seed/NEW-THEME-RUNBOOK.md` (Step 4, *What
the providers can and cannot draw*):

| Class | What it means here | Lane consequence |
|---|---|---|
| `small held object` | Identity rests on a small hand-held item — a soup bowl, a scythe, a noose, a cane, a pen | **The disqualifying one.** Both main lanes fail it; the runbook budgets *one or two per theme*, not fifteen. Either drop the object and let dress carry the figure, or spend 30–45 min per image on the `ai-horde` escape hatch |
| `multi-figure` | Identity is a pair, a procession or a scene — two guards, a troupe, a marching column | Passes on `cloudflare-sdxl`, fails on `pollinations`. **No longer disqualifying** |
| `niche costume` | Identity rests on period or regional dress accuracy — a dynasty's official robes, a specific mask, a hanbok | *Much better, not reliable* on `cloudflare-sdxl`. Photo-real drift on `ai-horde` |
| `none` | Reads from silhouette, colour or face alone | Safe on every lane |

**Kid-risk.** A note wherever the source story is gory, sexual, or otherwise hard to steer toward the
runbook's *non-scary, cute or comical* bar. `—` means clean. **A note is not a veto** — it is the work the
subject will cost at eduText and imagePrompt time.

## 2. Counts

| | |
|---|---|
| **Total candidates** | 89 |
| **Asia** | 50 (56%) — China/Sinophone 14, Japan 11, Korea 6, Southeast Asia 12, South Asia & Himalaya 7 |
| **Rest of world** | 39 — Europe 12, Middle East & Central Asia 7, Americas 8, Africa 7, Oceania 5 |

Asia lands at 56%, a little above the 40–50% steer. That is deliberate and worth knowing: #143 wants Asia
at *a third to a half of the final 30*, and the Asian bench is where the spent names (Jiangshi, Kappa)
bite hardest, so a deeper Asian shortlist buys more room to choose than a proportionate one would.

| Image-lane class | Count | |
|---|---|---|
| `none` | 47 | Safe on every lane — over half the roster |
| `niche costume` | 20 | Cloudflare lane only |
| `multi-figure` | 12 | Cloudflare lane only |
| `small held object` | 10 | **The runbook budgets 1–2 per theme. Treat these 10 as a pool to pick 1–2 from, not a set:** Meng Po, Dizang, Jizō, Jowangsin, Kapre, Yama, Ankou, Grogh, Santa Muerte, Baron Samedi |

| Practice flag | Count |
|---|---|
| `living practice` | 56 (63%) |
| `folklore` | 33 (37%) |

**Kid-risk:** 67 of 89 carry a note; 22 are clean. The heaviest concentration is Southeast and South Asia,
where a whole family of figures is *defined by* death in childbirth (Pontianak, Churel, Mae Nak,
Shakchunni) or by dead infants (Toyol, Tiyanak). Those are steerable but never trivially.

All three of the owner's mandated figures are present: **孟婆 Meng Po**, **牛頭馬面 Ox-Head and Horse-Face**,
**Pontianak**.

---

## 3. The longlist

### 3.1 China, Taiwan and the Sinophone world — 14

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Meng Po | 孟婆 | Old woman at the bridge to the next life who hands each passing soul a bowl of soup that makes them forget the life before | [wiki](https://en.wikipedia.org/wiki/Meng_Po) | living practice | small held object | — |
| Ox-Head and Horse-Face | 牛頭馬面 | A pair of underworld guards, one with an ox's head and one with a horse's, who escort new souls down to the courts | [wiki](https://en.wikipedia.org/wiki/Ox-Head_and_Horse-Face) | living practice | multi-figure | — |
| Black and White Impermanence | 黑白無常 | Two brother-officials of the underworld, one in white and one in black, who fetch souls when their time is up | [wiki](https://en.wikipedia.org/wiki/Heibai_Wuchang) | living practice | multi-figure | — |
| Yanluo Wang | 閻羅王 | Stern king and chief judge of the Chinese underworld, who reads each soul's record and decides where it goes next | [wiki](https://en.wikipedia.org/wiki/Yanluo_Wang) | living practice | niche costume | Temple art of his court is full of punishment scenes; steer to judge-with-ledger only |
| Zhong Kui | 鍾馗 | Bearded scholar-turned-ghost-catcher whose portrait is pinned beside doors to keep mischievous spirits out | [wiki](https://en.wikipedia.org/wiki/Zhong_Kui) | living practice | niche costume | Origin story is a suicide after a failed exam; use only the ghost-catcher role |
| City God | 城隍 | The spirit magistrate of a walled town, keeping its register of the living and the dead | [wiki](https://en.wikipedia.org/wiki/City_God_(China)) | living practice | niche costume | — |
| Tudigong | 土地公 | Kindly white-bearded earth grandfather of a village or street corner, thanked with incense for local good fortune | [wiki](https://en.wikipedia.org/wiki/Tudigong) | living practice | none | — |
| Kitchen God | 灶君 | Household spirit who lives above the stove, watches the family all year and reports to heaven at New Year | [wiki](https://en.wikipedia.org/wiki/Kitchen_God) | living practice | niche costume | — |
| Door Gods | 門神 | Two armoured guardians pasted one on each leaf of a doorway so that bad luck cannot come in | [wiki](https://en.wikipedia.org/wiki/Menshen) | living practice | multi-figure | — |
| Dizang | 地藏 | Monk-like bodhisattva who vowed to walk down into the underworld himself and guide lost souls back out | [wiki](https://en.wikipedia.org/wiki/Kshitigarbha) | living practice | small held object | Same figure as Japan's Jizō below — pick one, not both |
| Huli Jing | 狐狸精 | Fox spirit that studies for centuries until it can take human shape, appearing as trickster, helper or fox immortal | [wiki](https://en.wikipedia.org/wiki/Huli_jing) | folklore | none | Classic tales are seduction stories draining a man's life essence; use the trickster framing |
| Shui Gui | 水鬼 | Water ghost said to linger in the river or pond where someone drowned, hoping for a chance to return ashore | [wiki](https://en.wikipedia.org/wiki/Shui_gui) | folklore | none | Whole legend is drowning and body-swapping; keep to a shy pond-dweller |
| Egui | 餓鬼 | Wandering hungry spirit with a thin neck and round belly, fed with food and paper offerings each Ghost Month | [wiki](https://en.wikipedia.org/wiki/Hungry_ghost) | living practice | none | Starvation imagery in the source; draw plump and comical, never emaciated |
| Ba Jia Jiang | 八家將 | Troupe of eight painted-face underworld generals who march ahead of a god's palanquin to clear away bad spirits | [wiki](https://en.wikipedia.org/wiki/Ba-Jia-Jiang) | living practice | multi-figure | — |

### 3.2 Japan — 11

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Yuki-onna | 雪女 | A pale snow spirit who appears on blizzard nights and drifts over the snow leaving no footprints | [wiki](https://en.wikipedia.org/wiki/Yuki-onna) | folklore | none | Most tales have her freezing lost travellers; a common version turns on a broken promise |
| Zashiki-warashi | 座敷童子 | A child-shaped house spirit that plays in the guest room and brings a household its good fortune | [wiki](https://en.wikipedia.org/wiki/Zashiki-warashi) | living practice | none | The house falls to ruin once it leaves; some tellings link it to dead children |
| Kasa-obake | 傘お化け | A hundred-year-old paper umbrella that wakes up as a spirit, hopping on one leg with one big eye | [wiki](https://en.wikipedia.org/wiki/Kasa-obake) | folklore | none | — |
| Ittan-momen | 一反木綿 | A long strip of white cotton cloth that flies through the evening sky over the roads of Kagoshima | [wiki](https://en.wikipedia.org/wiki/Ittan-momen) | folklore | none | Classic tale has it wrapping around a traveller's face and neck |
| Kodama | 木霊 | A quiet tree spirit living inside an old tree; the mountain echo is said to be its answer | [wiki](https://en.wikipedia.org/wiki/Kodama_(spirit)) | living practice | none | — |
| Noppera-bō | のっぺら坊 | A road spirit that looks like an ordinary person until it turns around and shows a smooth blank face | [wiki](https://en.wikipedia.org/wiki/Noppera-b%C5%8D) | folklore | none | Built entirely on a startle reveal; needs a comical rather than a shock framing |
| Rokurokubi | ろくろ首 | A person who looks ordinary by day but whose neck stretches long and wandering after dark | [wiki](https://en.wikipedia.org/wiki/Rokurokubi) | folklore | none | Some versions detach the head; keep strictly to the stretchy-neck version |
| Shinigami | 死神 | A death spirit of Japanese folk belief and rakugo said to accompany a person's final hours | [wiki](https://en.wikipedia.org/wiki/Shinigami) | folklore | none | Death-themed throughout; the best-known rakugo tale involves suicide |
| Jizō | 地蔵 | A gentle stone guardian set by roads and hills, dressed by villagers in a red bib and cap | [wiki](https://en.wikipedia.org/wiki/Ksitigarbha) | living practice | small held object | Venerated above all as protector of the souls of dead children — the most delicate framing on this list |
| Kijimunā | キジムナー | An Okinawan banyan-tree spirit like a red-haired child with a big head, fond of fishing and pranks | [wiki](https://en.wikipedia.org/wiki/Kijimuna) | folklore | none | Signature prank is sitting on a sleeper's chest (sleep paralysis); eats only fish eyes |
| Kamuy Fuchi | カムィフチ | The Ainu hearth goddess who never leaves the fire, guarding the doorway between people and spirits | [wiki](https://en.wikipedia.org/wiki/Kamuy_Fuchi) | living practice | niche costume | — |

### 3.3 Korea — 6

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Jeoseung Saja | 저승사자 | A messenger of the afterlife who calls a name three times and walks the soul to the next world | [wiki](https://en.wikipedia.org/wiki/Jeoseung_Saja) | living practice | niche costume | Death-messenger by definition; the modern black-robe-and-gat image is deliberately eerie |
| Dokkaebi | 도깨비 | A playful Korean spirit born when energy settles into an old tool, keen on wrestling and riddles | [wiki](https://en.wikipedia.org/wiki/Dokkaebi) | living practice | none | Some traditions have them born from blood-stained objects. **Naming watch:** routinely glossed "Korean goblin"; *Goblin* is taken |
| Gwisin | 귀신 | A Korean ghost in white who lingers with something left unfinished rather than moving on | [wiki](https://en.wikipedia.org/wiki/Gwisin) | living practice | niche costume | Nearly every gwisin tale starts from an unjust death. **Naming watch:** literally means "ghost"; *Ghost* is taken |
| Samsin Halmoni | 삼신할머니 | The grandmother goddess who brings babies and watches over every child until the age of seven | [wiki](https://en.wikipedia.org/wiki/Samsin_Halmoni) | living practice | niche costume | Her domain is childbirth and infant survival; stay well away from that side |
| Jowangsin | 조왕신 | The goddess of the kitchen hearth, who lives in a bowl of fresh water set above the stove | [wiki](https://en.wikipedia.org/wiki/Jowangsin) | living practice | small held object | — |
| Jangseung | 장승 | Carved wooden guardian posts with wide grinning faces, standing at the edge of a village to watch the road | [wiki](https://en.wikipedia.org/wiki/Jangseung) | living practice | multi-figure | — |

### 3.4 Southeast Asia — 12

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Pontianak | — | A white-robed woman of Malay, Indonesian and Singaporean night stories; the city of Pontianak is named for her | [wiki](https://en.wikipedia.org/wiki/Pontianak_(folklore)) | living practice | none | Origin is death in childbirth; she is said to prey on pregnant women and babies |
| Pocong | — | An Indonesian ghost still bound in its white burial shroud, said to hop because the knots were never untied | [wiki](https://en.wikipedia.org/wiki/Pocong) | living practice | none | The figure is literally a wrapped corpse; comical hopping is the only viable angle |
| Toyol | — | A small child-spirit a shaman is said to keep in a jar and send out to take coins and trinkets from neighbours | [wiki](https://en.wikipedia.org/wiki/Toyol) | living practice | none | It is an undead infant; lore ties its making to dead babies and black magic |
| Wewe Gombel | — | A Javanese night spirit who carries off neglected children and looks after them until their parents mend their ways | [wiki](https://en.wikipedia.org/wiki/Wewe_Gombel) | folklore | none | Child abduction; her origin tale is murder and suicide, and she is traditionally drawn bare-breasted |
| Rangda | ᬭᬗ᭄ᬤ | The mask-faced widow queen of Balinese temple drama, forever fought to a draw by the lion-spirit Barong | [wiki](https://en.wikipedia.org/wiki/Rangda) | living practice | niche costume | Named a child-eater in myth; the traditional mask has fangs and a long tongue, and she is depicted near-nude |
| Tiyanak | — | A Philippine spirit that cries like a lost baby in the woods to draw travellers off the path | [wiki](https://en.wikipedia.org/wiki/Tiyanak) | living practice | none | The soul of a dead infant; folk-Catholic versions tie it to unbaptised babies and to abortion |
| Kapre | — | A tall tree-dwelling spirit of Philippine lore who sits in a balete or mango tree at dusk smoking a cigar | [wiki](https://en.wikipedia.org/wiki/Kapre) | living practice | small held object | Smoking is central to the image and would have to be dropped outright |
| Mae Nak Phra Khanong | แม่นากพระโขนง | Bangkok's most famous ghost story: a wife who waited at home for her soldier husband long after she should have | [wiki](https://en.wikipedia.org/wiki/Mae_Nak_Phra_Khanong) | living practice | multi-figure | She died in childbirth and is nearly always shown holding her dead infant; her shrine draws real offerings today |
| Phi Ta Khon | ผีตาโขน | Ghost-masqueraders of the Dan Sai festival in Loei, in towering carved masks and rag costumes, who parade to bring rain | [wiki](https://en.wikipedia.org/wiki/Phi_Ta_Khon) | living practice | niche costume | — |
| Ông Táo | 翁灶 | Vietnam's three Kitchen Gods, who ride a carp to heaven to report on the family at Tết | [wiki](https://en.wikipedia.org/wiki/%C3%94ng_T%C3%A1o) | living practice | multi-figure | Overlaps China's Kitchen God above — pick one |
| Popa Medaw | ပုပ္ပားမယ်တော် | The flower-eating Mother of Popa, a Burmese nat who rules Mount Popa and is honoured at its shrines | [wiki](https://en.wikipedia.org/wiki/Popa_Medaw) | living practice | niche costume | Her legend turns on her two sons being put to death; the card must stop before that |
| Neak Ta | អ្នកតា | Cambodian ancestor-guardians of a village, housed in a little cabin shrine under a big tree or by the paddy | [wiki](https://en.wikipedia.org/wiki/Neak_ta) | living practice | multi-figure | — |

### 3.5 South Asia and the Himalaya — 7

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Vetala | वेताल | A hanging-upside-down spirit of Indian tale-cycles that rides on a king's back and sets him riddles all night | [wiki](https://en.wikipedia.org/wiki/Vetala) | folklore | none | Defined by inhabiting corpses and haunting cremation grounds; the riddle-teller angle is the way out |
| Yama | यम | The Hindu lord of the dead, first mortal to find the path, who weighs each life and keeps the record of deeds | [wiki](https://en.wikipedia.org/wiki/Yama_(Hinduism)) | living practice | small held object | Actively worshipped; his fixed attribute is a noose — drop it |
| Churel | چڑیل / चुड़ैल | A night spirit of Pakistan and north India known by her backwards-turned feet, said to wait at crossroads | [wiki](https://en.wikipedia.org/wiki/Churel) | folklore | none | Origin is a woman who died in or around childbirth; the seduction thread must be cut |
| Shakchunni | শাকচুন্নি | A Bengali ghost in a married woman's red-and-white sari and conch bangles, said to sit in sheora trees | [wiki](https://en.wikipedia.org/wiki/Shakchunni) | folklore | niche costume | Defined by a wife's death and by possessing living women; widowhood themes run under the whole story |
| Sanni Yaka | සන්නි යකා | Masked illness-spirits of Sri Lanka's all-night Sanni Yakuma dance, summoned by name and then sent away | [wiki](https://en.wikipedia.org/wiki/Sanni_Yakuma) | living practice | niche costume | The eighteen masks each stand for a disease; pick a mild one or keep it generic |
| Lakhey | लाखे | A red-maned forest spirit of Newar Kathmandu who became the town's protector and dances through Indra Jatra | [wiki](https://en.wikipedia.org/wiki/Lakhey) | living practice | niche costume | Fanged mask is frightening by design; in the dance a small boy taunts him into a chase |
| Citipati | चितिपति | The dancing skeleton lords of Tibetan Buddhism, a male and female pair who guard the cemetery | [wiki](https://en.wikipedia.org/wiki/Citipati_(Buddhism)) | living practice | multi-figure | Skeletal figures in a graveyard; the pair are entwined, so the pose needs restaging |

### 3.6 Europe — 12

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Draugr | draugur | Norse walking dead that guards its burial mound and the treasure buried with it | [wiki](https://en.wikipedia.org/wiki/Draugr) | folklore | none | Grave-dwelling corpse; the saga tales are body-horror and hard to soften |
| Mare | — | Scandinavian night spirit that perches on a sleeper's chest and brings bad dreams | [wiki](https://en.wikipedia.org/wiki/Mare_(folklore)) | folklore | multi-figure | Bedtime-scare theme, and the scene needs a sleeping figure too. **Naming watch:** "Mare" alone will read as a horse |
| Rusalka | русалка | Slavic water spirit who sings and dances by rivers on summer nights | [wiki](https://en.wikipedia.org/wiki/Rusalka) | folklore | none | Drowned-girl origin; in many versions she pulls swimmers under |
| Domovoy | домовой | Slavic house spirit, a little grey-bearded man who guards the family, the children and the animals | [wiki](https://en.wikipedia.org/wiki/Domovoy) | folklore | none | — |
| Ankou | — | Breton servant of death who drives a creaking cart for the dead; the year's last dead takes the post | [wiki](https://en.wikipedia.org/wiki/Ankou) | folklore | small held object | Scythe plus skeletal figure; one church carving has him holding a severed head |
| Sluagh | — | Gaelic host of the restless dead that sweeps past on the night wind in a crescent-shaped flock | [wiki](https://en.wikipedia.org/wiki/Sluagh) | folklore | multi-figure | Snatches the souls of the dying; identity is a whole flying host, not one figure |
| Krampus | — | Alpine horned companion of St Nicholas who calls on children who have behaved badly | [wiki](https://en.wikipedia.org/wiki/Krampus) | living practice | none | Child-punishing by design: birch switch, chains, and a basket for carrying children off |
| Klabautermann | — | Ship kobold of North Sea and Baltic sailors who patches leaks and keeps a well-kept vessel safe | [wiki](https://en.wikipedia.org/wiki/Klabautermann) | folklore | niche costume | Seeing him means the ship is doomed; identity rests on old sailor dress and cap |
| Befana | — | Italian broomstick-riding old woman who fills children's stockings on Epiphany night | [wiki](https://en.wikipedia.org/wiki/Befana) | living practice | niche costume | — |
| Giltinė | — | Lithuanian goddess of death and sister of the luck-goddess Laima; the owl is her bird | [wiki](https://en.wikipedia.org/wiki/Giltin%C4%97) | folklore | none | Death personified; folk tales give her a poisonous tongue and a plague aspect |
| Charon | Χάρων | Greek ferryman who rows the dead across the underworld river for the price of one coin | [wiki](https://en.wikipedia.org/wiki/Charon) | folklore | none | Ferries the dead; tied to the coin-in-the-mouth burial custom |
| Samodiva | самодива | Balkan forest maiden in white who dances in mountain meadows and guards the springs | [wiki](https://en.wikipedia.org/wiki/Samodiva_(folklore)) | folklore | none | Some tales turn on seduction and on revenge against men who spy on them |

### 3.7 Middle East, Central Asia and the Caucasus — 7

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Jinn | جن | Unseen beings made of smokeless fire in Arabian and Islamic belief, living in societies of their own | [wiki](https://en.wikipedia.org/wiki/Jinn) | living practice | none | Quranic and actively believed by many Muslims. Depict respectfully; never as a monster |
| Peri | پری | Winged Persian spirit of great beauty, helpful to people and set against the hostile div | [wiki](https://en.wikipedia.org/wiki/Peri) | folklore | none | — |
| Azrael | عزرائيل | Angel of death in Islamic and Jewish tradition who takes each soul at its appointed time | [wiki](https://en.wikipedia.org/wiki/Azrael) | living practice | none | Death itself is the subject, and he is a revered living figure — needs a gentle treatment or none |
| Fravashi | فروهر | Zoroastrian guardian spirit of a person, living or dead, honoured at ancestral feast days each year | [wiki](https://en.wikipedia.org/wiki/Fravashi) | living practice | none | — |
| Erlik | Эрлик | Turkic-Mongol lord of the underworld who judges the dead; Siberian shamans still bargain with him | [wiki](https://en.wikipedia.org/wiki/Erlik) | living practice | none | Brings plague in the myths; some accounts give him a boar-like face |
| Grogh | գրող | Armenian underworld scribe who writes down the names and the deeds of those who die | [wiki](https://en.wikipedia.org/wiki/Grogh) | folklore | small held object | Identity rests on pen and book; his writing is what marks the dying |
| Samdzimari | სამძიმარი | Georgian Khevsur shrine goddess robed in gold who speaks to villagers through their oracles | [wiki](https://en.wikipedia.org/wiki/Samdzimari) | folklore | niche costume | Her myth includes adult liaison motifs and a rescue from a demon underworld |

### 3.8 The Americas — 8

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| La Llorona | — | Weeping ghost in a white gown who wanders rivers at night calling for the children she has lost | [wiki](https://en.wikipedia.org/wiki/La_Llorona) | folklore | none | Core story is a mother drowning her own children; needs a full rewrite to be usable |
| Santa Muerte | — | Robed skeleton folk saint of death, honoured with candles, flowers and prayers by millions | [wiki](https://en.wikipedia.org/wiki/Santa_Muerte) | living practice | small held object | Scythe and globe carry the identity; a venerated saint, and press coverage links her to cartel crime |
| Mictlantecuhtli | — | Aztec lord of Mictlan, the underworld, a skeletal figure who receives the dead on their long journey | [wiki](https://en.wikipedia.org/wiki/Mictlantecuhtli) | folklore | niche costume | Skeletal deity tied to sacrifice practice; identity rests on accurate Aztec regalia |
| Baron Samedi | — | Top-hatted lwa who keeps the cemetery gate and decides who may cross into the land of the dead | [wiki](https://en.wikipedia.org/wiki/Baron_Samedi) | living practice | small held object | Cane, cigar and rum define him; the lore is bawdy and he is a sacred lwa in living Vodou |
| Duppy | — | Ghost of a dead person that walks after dark; salt at the doorway is said to keep it out | [wiki](https://en.wikipedia.org/wiki/Duppy) | living practice | none | — |
| Curupira | — | Red-haired forest guardian with backward-turned feet who confuses hunters and shields the animals | [wiki](https://en.wikipedia.org/wiki/Curupira) | folklore | none | — |
| Supay | — | Quechua lord of the underworld Ukhu Pacha, still honoured as El Tío in Bolivian mines | [wiki](https://en.wikipedia.org/wiki/Supay) | living practice | none | Merged with the Christian devil after conquest; horned imagery will read as demonic |
| Wendigo | — | Spirit of winter famine and greed, a gaunt frost-bitten figure said to stalk the northern woods | [wiki](https://en.wikipedia.org/wiki/Wendigo) | folklore | none | Cannibalism is central; sacred to living Algonquian communities; the pop-culture antlered version reads as a beast and is out of scope |

### 3.9 Africa — 7

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Tokoloshe | — | Small hairy sprite of Zulu lore blamed for night mischief; beds are raised on bricks to escape it | [wiki](https://en.wikipedia.org/wiki/Tokoloshe) | folklore | none | Some tellings involve sexual assault; still widely feared, not merely a story |
| Egungun | — | Ancestral spirits returning as whirling masquerades in layered, glittering cloth panels | [wiki](https://en.wikipedia.org/wiki/Egungun) | living practice | niche costume | Active religious masquerade; the costume *is* the identity, and the wearer must never be shown unmasked |
| Mami Wata | — | Water spirit honoured for healing and fortune, pictured with long flowing hair and a serpent | [wiki](https://en.wikipedia.org/wiki/Mami_Wata) | living practice | none | Lore involves seduction and pacts for wealth; visually very close to the already-taken *Mermaid* |
| Aziza | — | Kindly little forest people of Dahomey who live in anthills and silk-cotton trees and give hunters good magic | [wiki](https://en.wikipedia.org/wiki/Aziza_(African_mythology)) | folklore | none | — |
| Simbi | — | Bakongo guardian spirits of springs, rivers and groves who keep the water boundary between worlds | [wiki](https://en.wikipedia.org/wiki/Simbi) | living practice | none | Sometimes appear in serpent form — art direction must keep them humanoid |
| Anubis | 𓇋𓈖𓊪𓅱 | Jackal-headed guide of the dead who escorts souls to the weighing of the heart | [wiki](https://en.wikipedia.org/wiki/Anubis) | folklore | none | Animal-headed — must be drawn as a robed standing figure or it becomes a beast card |
| Zār | ዛር / زار | Spirit believed to visit and unsettle a person, calmed by a ceremony of drumming and incense | [wiki](https://en.wikipedia.org/wiki/Z%C4%81r) | living practice | niche costume | Living possession-healing practice; the spirit has no fixed body, so the card leans entirely on ritual dress — weak |

### 3.10 Oceania — 5

| Name | Native script | What it is | Source | Practice | Image lane | Kid-risk |
|---|---|---|---|---|---|---|
| Patupaiarehe | — | Pale, red-haired fairy folk of Māori tradition who live in misty forest and hilltops and shun daylight | [wiki](https://en.wikipedia.org/wiki/Patupaiarehe) | living practice | none | Widely published, not restricted; depict respectfully and without moko |
| Hine-nui-te-pō | — | Atua of night and the underworld who receives the spirits of the dead at the end of their path | [wiki](https://en.wikipedia.org/wiki/Hine-nui-te-p%C5%8D) | living practice | none | A sacred atua; the famous Māui episode is sexual and fatal — use only the goddess-of-night framing |
| Mimi | — | Stick-thin rock spirits of Arnhem Land who taught people to hunt and paint; so slender the wind could snap them | [wiki](https://en.wikipedia.org/wiki/Mimi_(folklore)) | living practice | none | Publicly documented, not restricted business, but Aboriginal-owned imagery — draw in the app's own style, never copy actual rock art |
| Nightmarchers | — | Torch-bearing procession of ancient Hawaiian warrior ghosts said to march to sacred sites on certain nights | [wiki](https://en.wikipedia.org/wiki/Nightmarchers) | living practice | multi-figure | Identity is a whole marching column; lore says looking at them is fatal |
| Taotaomo'na | — | Ancestral spirits of the Marianas who live in banyan trees and guard wild places from the careless | [wiki](https://en.wikipedia.org/wiki/Taotao_Mona) | living practice | none | Some are described as headless, and as pinching or briefly carrying off children |

---

## 4. Things the spec will have to decide

These are not findings; they are the questions the roster raises and cannot answer.

1. **63% of the roster is live religion.** Meng Po, Ox-Head and Horse-Face, Jizō, Yama, Azrael, Jinn,
   Egungun, Baron Samedi and Hine-nui-te-pō are not folklore in the way Baba Yaga is. #143's treatment
   rules need a rule for this, and "In old European folklore…" is exactly the eduText formula that will
   get it wrong.
2. **The `small held object` budget is 1–2 and there are 10 candidates for it.** Meng Po's soup bowl is one
   of them — and she is a mandated figure whose entire identity is that bowl. Either she takes the theme's
   whole escape-hatch budget, or the bowl goes and she is drawn as a bridge-side grandmother.
3. **Two genuine duplicate pairs.** Dizang / Jizō are the same bodhisattva; Kitchen God / Ông Táo are the
   same household spirit. Pick one of each.
4. **Three naming watch-items** that are not string collisions but read as near-misses: **Gwisin**
   (literally "ghost"), **Dokkaebi** (standardly glossed "Korean goblin"), and **Mare** (reads as a horse).
5. **Legendary has no obvious axis here** — #143 already flags this. If it helps: the roster's natural
   "biggest" candidates are the underworld sovereigns (Yanluo Wang, Yama, Erlik, Mictlantecuhtli,
   Hine-nui-te-pō), which is a *rank* axis rather than a size one.

## 5. What was rejected, and why

**Name collisions** — checked against all 540 taken names. The European bench is where *Spooky Legends*
part 1 hurts most:

| Rejected | Clashes with |
|---|---|
| Dullahan | *Headless Horseman* — the same headless-rider card |
| Bean Nighe | *Banshee* — same bean sídhe family |
| Tomte / Nisse | *Gnome* and *Brownie* — Tomte is standardly translated "gnome" |
| Kobold | *Goblin* and *Imp* |
| Nøkk / Nixie | *Kelpie* — same water-luring slot |
| Strigoi / Moroi | *Dracula* — the Romanian revenant already carded |
| Hungry Ghost, Water Ghost, Nu Gui | *Ghost* — kept as **Egui** and **Shui Gui** instead |
| Yeti, Jiangshi, Kappa, Kirin, Fenghuang | already carded under those exact names |

**Out of scope as beasts** (they belong to *Mythic Creatures*, per #143): Nue, Bakunawa, Tikbalang,
Nāga / Phaya Nak, Maha Sona (bear- or tiger-headed), Kamaitachi, Eobshin, Cù Sìth, Nachtkrapp, Grootslang,
Mapinguari, Chimera, Manticore.

**Unusable gore, not merely flagged.** The detached-head-with-trailing-organs family — **Penanggalan**
(Malay), **Krasue** (Thai), **Leyak** (Balinese), **Ap** (Khmer) — has no steerable version; the organs
*are* the figure. Likewise **Manananggal** and **Aswang** (body-splitting, and their main forms are
animal), and **Wangliang** (corpse-eating).

**No dedicated source.** Nü gui and Korpokkur were dropped rather than sourced to a list entry; Korpokkur
is in any case a legendary people, not a spirit.

**Held in reserve** — real candidates, cut only to keep the list inside its size band, all sourced and all
`200`: **Tai Sui** 太歲 ([wiki](https://en.wikipedia.org/wiki/Tai_Sui), living practice, niche costume —
abstract, an astrological year-general rather than a figure); **Bed Mother** 床母
([wiki](https://en.wikipedia.org/wiki/Chuangshen), living practice, none — obscure, no strong silhouette);
**Kong Koi** ผีกองกอย ([wiki](https://en.wikipedia.org/wiki/Kong_koi), folklore, none — blood-drinking, and
some accounts describe it as monkey-like, which risks reading as an animal).
