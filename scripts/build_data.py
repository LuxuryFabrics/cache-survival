#!/usr/bin/env python3
"""Build bundled offline data: survival library, gazetteer, world land polygons."""

from __future__ import annotations

import json
import os
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def doc(id: str, title: str, category: str, source: str, license: str, tags: list[str], body: str) -> dict:
    return {
        "id": id,
        "title": title,
        "category": category,
        "source": source,
        "license": license,
        "tags": tags,
        "body": body.strip(),
        "updatedAt": "2026-01-01",
    }


def library() -> list[dict]:
    fema = "Adapted from FEMA public-domain preparedness guidance (U.S. Government work)."
    cdc = "Adapted from CDC public-domain health guidance (U.S. Government work)."
    fm = "Adapted from U.S. Army Field Manual public-domain doctrine (U.S. Government work)."
    cache = "CACHE original field notes (CC0). Conservative; not a substitute for training."
    docs = []

    docs.append(doc(
        "priorities-rule-of-threes",
        "Survival priorities and the rule of threes",
        "general",
        cache,
        "CC0",
        ["priorities", "planning", "rule of threes"],
        """
In a sudden emergency, stop moving. Breathe. Look. Then work in this order unless a more urgent threat is obvious:

1. Immediate danger — traffic, fire, falling rock, rising water, hostile animals, gunfire. Leave the kill zone.
2. Massive bleeding — pack and press, or apply a tourniquet high and tight on a limb. A person can bleed out in minutes.
3. Airway and breathing — open the airway, treat a sucking chest wound, remove from smoke.
4. Shelter from the environment — hypothermia and hyperthermia kill faster than hunger.
5. Water — plan the next drink before you are thirsty, but do not drink untreated surface water out of panic.
6. Signaling and location — make yourself findable while you still have energy.
7. Food — last. Healthy adults tolerate days without calories far better than a night of wet wind.

The “rule of threes” is a memory aid, not physics: roughly three minutes without air, three hours in harsh exposure, three days without water, three weeks without food. Cold water, altitude, injury, and children compress those numbers.

Make a tiny plan you can finish: “I will move 50 meters to that rock band, put on the rain layer, and blow the whistle in sets of three.” Finish it. Then make the next plan. Panic is a plan to waste heat and water.
""",
    ))

    docs.append(doc(
        "stop-think-observe-plan",
        "STOP: stop, think, observe, plan",
        "general",
        fm,
        "US Government public domain",
        ["stop", "lost", "planning"],
        """
When you realize you are lost or the plan has failed, sit down if the site is safe. The Army lost-person method is STOP.

Stop. Do not “walk one more ridge.” Most lost walkers enlarge the search area and leave the last point a rescuer can predict.

Think. What was the last known position? What time is it? Who knows your plan? What is the weather doing in the next six hours?

Observe. Terrain, weather, injuries, remaining daylight, clothing, water, signaling tools, morale of the group. Inventory pockets. A trash bag is a vapor barrier. A mirror or phone screen is a signal.

Plan. Choose a tactic: stay and signal if you are on a route someone will search; move only if the current site will kill you (flood, exposure, rockfall) or if a short, certain move reaches water, cover, or a linear feature (road, river, power line) you can follow.

Stay together. Mark the sit-down point. If you must move, leave a note and arrows. Travel in short legs to obvious attack points. When in doubt, stay put and improve shelter and signal.
""",
    ))

    docs.append(doc(
        "march-bleeding",
        "Massive bleeding: MARCH and tourniquets",
        "medical",
        "Adapted from U.S. military TCCC / public-domain first-aid doctrine + CACHE notes.",
        "US Government public domain + CC0",
        ["bleed", "tourniquet", "march", "wound"],
        """
MARCH is a field order of work for trauma: Massive hemorrhage, Airway, Respiration, Circulation, Hypothermia / Head.

Massive bleeding first. Blood on the ground, spurting, or a soaked limb is a now problem.

Limb bleeds: apply a manufactured tourniquet 2–3 inches above the wound, never on a joint, tighten until bleeding stops and the distal pulse is gone. Note the time. A second tourniquet above the first if it fails. Improvised windlass tourniquets fail often — use them only if nothing else exists and tighten with a sturdy rod.

Junctional bleeds (groin, axilla, neck): pack with gauze or clean cloth and press with your entire body weight. Do not let up to “check” every few seconds. Hold at least 10 minutes by the clock.

Do not make a wound map with your fingers. Do not remove embedded objects. Do not use a belt loosely as a decoration — it must occlude arterial flow or it is just a souvenir.

After bleeding stops: airway, then seal an open chest wound with a vented chest seal if trained, then keep the person warm. Trauma plus cold is a clotting disaster.

This is field first aid, not a hospital. Evacuate any tourniquet, penetrating trauma, or uncontrolled bleed.
""",
    ))

    docs.append(doc(
        "airway-cpr",
        "Airway, choking, and CPR limits in the field",
        "medical",
        cdc,
        "US Government public domain",
        ["airway", "cpr", "choking"],
        """
If a person is talking, the airway is open enough for now. If they are silent, cyanotic, or making high-pitched efforts, act.

Choking, responsive adult: stand behind, fist above the navel, inward and upward thrusts (Heimlich) until the object comes out or they go unresponsive. For infants, alternate 5 back blows and 5 chest thrusts.

Unresponsive: call for help, lower to the ground, begin CPR if you are trained. Field CPR without rapid defibrillation and advanced care has a poor outlook; still begin if you can continue until relieved, especially for drowning or lightning where the heart may restart.

Recovery position for a breathing, unresponsive person with no spinal mechanism: on the side, airway open, so vomit drains.

Do not practice “field tracheotomy.” You will not improve an airway with a pocketknife.

Suspected spine injury with a compromised airway: jaw-thrust if trained, move as a unit only as much as needed to breathe and to leave immediate danger.
""",
    ))

    docs.append(doc(
        "shock-hypothermia-combo",
        "Shock and the bleeding-cold spiral",
        "medical",
        fm,
        "US Government public domain",
        ["shock", "hypothermia", "trauma"],
        """
Shock is inadequate perfusion. In the field you will see it after bleeding, burns, dehydration, anaphylaxis, or heart strain.

Signs: pale, clammy, rapid weak pulse, anxiety then apathy, thirst, delayed cap refill.

Treatment you can actually do: stop bleeding, keep flat if no breathing problem, elevate legs only if no pelvic/leg fracture suspicion and it does not worsen breathing, prevent heat loss (pad underneath first), sip water only if fully awake and not pending surgery for belly trauma.

Hypothermia and shock feed each other. A wet person on the ground in wind will not clot well. Strip wet clothing when you have a dry layer ready. Wrap in a vapor barrier (bag, tarp) over insulation. Warm at the chest and groin with body heat or warm (not hot) bottles. Do not rub frozen extremities. Do not give alcohol.

Evacuate anyone who is getting sleepier, colder, or more confused.
""",
    ))

    docs.append(doc(
        "fractures-sprains",
        "Fractures, sprains, and splinting",
        "medical",
        fm,
        "US Government public domain",
        ["fracture", "sprain", "splint"],
        """
You often cannot tell a bad sprain from a break. Treat the limb as broken if it is deformed, unstable, numb, or the person heard a crack and cannot bear weight.

Check circulation, sensation, and motion below the injury before and after you splint. If a limb is pulseless and deformed and you are trained, a gentle attempt to restore alignment may be justified before a long carry — otherwise splint as it lies.

Splint principles: immobilize the joint above and below. Pad voids. Do not bury the toes or fingers — you need to recheck color. For a femur, traction splints are specialized; in haste, the other leg can be a splint if both are uninjured enough.

Open fracture: cover with clean dressing, do not shove bone back, control bleeding, evacuate.

RICE is for stable sprains: rest, ice or cold creek water in a cloth, compression, elevation. A person who must walk out on a sprain needs a firm wrap and a shorter day, not heroics.
""",
    ))

    docs.append(doc(
        "burns-blisters",
        "Burns and hot-shelter injuries",
        "medical",
        cdc,
        "US Government public domain",
        ["burn", "blister", "fire"],
        """
Cool a thermal burn with clean room-temperature water for 10–20 minutes. Do not use grease, butter, toothpaste, or ice. Remove jewelry before swelling. Leave stuck clothing.

Cover loosely with a clean non-fluffy dressing. Do not pop large blisters on the trail if you can protect them. If they tear, keep the skin as a dressing and use a thin antibiotic ointment only if you already carry it and the person is not allergic.

Evacuate: burns of the face, hands, feet, genitals; circumferential burns; electrical or chemical burns; burns over a large area; or any burn in a child plus smoke exposure.

Carbon monoxide from stoves in tents is a silent burn of the brain. Any headache, nausea, or confusion in a sealed shelter: get into open air immediately.
""",
    ))

    docs.append(doc(
        "wound-cleaning",
        "Cleaning and closing wounds in the field",
        "medical",
        cdc,
        "US Government public domain",
        ["wound", "infection", "irrigation"],
        """
The best field antibiotic is volume: irrigate with the cleanest water you have. A zip bag with a pinhole makes a jet. Pick out obvious debris. Do not use alcohol or hydrogen peroxide as a bath — they damage tissue.

Close only clean, fresh, low-tension cuts if you have steri-strips or a quality bandage and can watch for infection. Punctures, bites, and dirty wounds should stay open and get medical care.

Infection signs: spreading redness, pus, fever, red streaks, increasing pain after day two. Start toward help early; field infections become systemic fast in hot weather.

Animal bites: irrigate copiously, do not suture in the field, and assume rabies risk from bats and many wild mammals until a clinician says otherwise.
""",
    ))

    docs.append(doc(
        "water-disinfection",
        "Field water: settle, filter, disinfect",
        "food-water",
        cdc,
        "US Government public domain",
        ["water", "boil", "filter", "chlorine"],
        """
Assume every surface source is contaminated with feces. Clear-looking alpine water is not sterile.

Order of work:

1. Choose the cleanest source: flowing, upstream of camps, away from carcasses and eddies of foam.
2. Settle or prefilter cloudy water through a cloth. Chemicals and UV fail in silt.
3. Kill or remove pathogens.

Boil: a rolling boil for 1 minute (3 minutes above ~2,000 m / 6,500 ft) is the most reliable field method for microbes. It does not remove chemicals, fuel, or heavy metals.

Filters: 0.1–0.3 micron hollow fiber removes protozoa and most bacteria. Many do not reliably remove viruses. In agricultural or dense human watersheds, add a chemical or UV step after filtering.

Chemicals: follow the product label. Chlorine dioxide is kinder to Cryptosporidium than plain bleach if you wait the full time (often 30 minutes to 4 hours). Household bleach (unscented, ~5–8% sodium hypochlorite) is a last resort — typical guidance is 2 drops per quart of clear water, 4 if cloudy, wait 30 minutes, should smell faintly of chlorine. Concentrations vary; when unsure, boil.

Never drink seawater, urine, or blood as a water strategy. Distill seawater only if you have a real still and fuel.
""",
    ))

    docs.append(doc(
        "finding-water",
        "Finding water in dry country",
        "food-water",
        fm,
        "US Government public domain",
        ["water", "desert", "seep"],
        """
Travel at cool hours. Ration sweat, not just water: cover skin, do not strip, rest in shade.

Signs: converging animal trails, circling birds at dawn, green ribbons in a drainage, damp sand in an outside bend, bees, and cottonwoods or willows in the southwest.

Dig a seep in a dry wash at the lowest shady bend, not in the middle of a gravel bar. Let it cloud, then skim. Solar stills produce little water for the labor — a last resort, not a plan.

Dew: mop with a cloth at dawn from non-toxic plants, then wring. Do not lick unknown plants.

Avoid alkaline flats and water that stinks of chemicals, has oily sheen that does not break, or sits below mine tailings. No filter fixes that.

If you have a map, treat every marked spring as possibly dry. Carry what the walk requires; do not bet the day on a blue dot.
""",
    ))

    docs.append(doc(
        "food-rationing",
        "Rationing food and what not to eat",
        "food-water",
        cache,
        "CC0",
        ["food", "ration", "forage"],
        """
Calories are morale and heat, not an emergency of the first 24 hours for a healthy adult. Search and shelter beat foraging.

If you must stretch food: eat small regular amounts, especially fats and carbs, rather than one feast. Keep protein with water — urea is a water cost.

Universal foraging rules:
- Unknown plant = do not eat.
- Unknown mushroom = do not eat. There is no kitchen test, silver-spoon test, or animal-ate-it test that works.
- White and yellow berries are frequently toxic; red is not a safety color.
- Umbel white flowers (parsley family) include deadly hemlocks. Do not forage this family in a crisis.
- Avoid plants with milky sap unless you already know the species (some figs and lettuce relatives are exceptions; you will not sort them while hungry).
- Inland fish from warm still water can carry parasites — cook thoroughly.

The universal edibility test takes many hours and still fails on delayed toxins (death cap). Do not use it for mushrooms or for plants you cannot identify.

Cook when you can. Many “edible” wild foods are only edible after boiling.
""",
    ))

    docs.append(doc(
        "shelter-site",
        "Shelter site selection",
        "shelter",
        fm,
        "US Government public domain",
        ["shelter", "site", "flood"],
        """
A bad site makes a good tarp useless.

Avoid: dry creek beds and debris-choked drainages (flash flood), isolated tall trees in lightning country, dead trees (“widowmakers”), cornices and avalanche slopes, ant nests, game trails, and the very bottom of frost pockets.

Prefer: level enough to sleep, slightly raised, morning sun in cold weather, shade and breeze in heat, a nearby but not immediate water source, and a backstop from wind (thicket, rock, small rise). Face the opening 90 degrees off the wind, not into it and not always directly downwind of a fire.

In snow, probe for hazards. Dig to a firm layer. Insulation under you matters more than a roof.

Group shelters save heat and watch shifts. They also spread illness — keep a sick person slightly separate if you have the fabric.

Legal note on public land: emergency bivouacs are one thing; cutting live trees and building cabins is another. Use dead and down wood where allowed.
""",
    ))

    docs.append(doc(
        "hasty-shelters",
        "Hasty shelters: tarp, debris, snow",
        "shelter",
        fm,
        "US Government public domain",
        ["tarp", "debris hut", "snow"],
        """
Tarp A-frame: ridgeline between two trees or trekking poles, 30–45 degree walls, plenty of groundhog stakes or rocks in heck-tucks. A closed back wall beats a pretty open wing in wind. Dig a small trench on the uphill side so runoff does not become your bed.

Tarp lean-to: fast with a fire in front. Only works if you have a reflector and the wind agrees. Sparks will own a nylon tarp.

Debris hut: a rib cage of sticks, stuffed a meter thick with leaves or grass. It must look ridiculously overbuilt. Leave a small door plug. Labor-heavy; start before you are cold.

Snow trench or quinzhee: insulation is excellent if you stay dry. Ventilation is mandatory. A candle that dims means get out. Never sleep under an unprobed snow roof after a warm day.

Ground insulation: 10 cm of dry debris, a closed-cell pad, or a pack under the torso. Hypothermia starts from the soil.

Clothing is shelter. Vent sweat on the move; add layers the moment you stop.
""",
    ))

    docs.append(doc(
        "fire-craft",
        "Fire: tinder, kindling, fuel, and safety",
        "fire",
        fm,
        "US Government public domain",
        ["fire", "tinder", "stove"],
        """
Fire needs dry fuel in three sizes and oxygen. Prepare a full kit before the match.

Tinder: fatwood shavings, birch bark, inner cedar, cotton plus petroleum jelly, dryer lint stored dry, commercial tabs. Wet-wood “feather sticks” from the dry core of a dead branch.

Kindling: pencil-thick dead twigs from standing wood, not the wet forest floor.

Fuel: split larger wood. A log on the ground is a sponge.

Structure: teepee for a fast signal fire; log-cabin or lean-to for cooking. In wind, a trench fire. On snow, a green-wood or stone platform so the fire does not melt into a pit and drown.

Do not kindle under snow-loaded branches. Do not kindle on peaty ground that can smolder underground. Drown, stir, drown, and feel with the back of the hand before you leave.

Carbon monoxide: no charcoal or wood stove in an unvented tent. Melt snow for water near the door with ventilation, not in a sealed vestibule while you sleep.

If fire ban or extreme drought: use a stove on mineral soil and skip the campfire. Signaling can be a mirror and whistle instead.
""",
    ))

    docs.append(doc(
        "cold-weather",
        "Cold injury: hypothermia and frostbite",
        "climate",
        cdc,
        "US Government public domain",
        ["cold", "hypothermia", "frostbite"],
        """
Hypothermia is a dropping core temperature. Shivering, fumbling, mumbling, stumbling, then a false sense of warmth and a desire to lie down. The last two are an emergency.

Treat: stop heat loss, get out of wind and wet, pad from the ground, add a vapor barrier, feed if fully awake (warm sweet drinks, calories), and add heat to the torso. A walking mildly hypothermic person can still generate heat. A collapsed person needs evacuation and careful handling — rough movement can trigger arrhythmia.

Frostbite: pale, waxy, numb ears, nose, fingers, toes. Do not rub with snow. Do not thaw if the part will refreeze on the march — freeze-thaw-freeze destroys tissue. Thaw in warm water (~37–39 C) only when you can keep it thawed and the person can stay put. Protect blisters. Ibuprofen if they already use it and have no contraindication; this is not a complete treatment.

Prevention: stay dry, cover skin, eat, buddy-check noses, loosen boots that cut circulation, and ventilate so sweat does not soak insulation.
""",
    ))

    docs.append(doc(
        "heat-illness",
        "Heat cramps, exhaustion, and stroke",
        "climate",
        cdc,
        "US Government public domain",
        ["heat", "stroke", "dehydration"],
        """
Heat cramps: salt and water, rest in shade, gentle stretch.

Heat exhaustion: heavy sweat, nausea, headache, weakness, fast pulse. Shade, lie down, cool water on skin, sip fluids with some salt if they can keep it down. They should not walk a desert afternoon “to the car.”

Heat stroke: hot person with confusion, collapse, or seizures — a true emergency. Sweating may be present or absent. Cool immediately: remove layers, soak, fan, ice at neck/armpits/groin if you have it. Evacuate. Do not wait for them to “sleep it off.”

Prevention: start earlier than pride allows, cover skin from sun, drink on a schedule, and add electrolytes if you are soaking shirts. Dark urine is late information. Children and the elderly cook faster in parked-car and tent-in-sun conditions.

Hyponatremia (too much plain water, too little salt) looks like heat illness and is worsened by forcing gallons. If someone is bloated, vomiting, and confused after huge water intake, stop the water and get medical care.
""",
    ))

    docs.append(doc(
        "navigation-compass",
        "Map and compass: bearing, declination, resection",
        "navigation",
        fm,
        "US Government public domain",
        ["compass", "bearing", "declination"],
        """
A compass does not know where you are. It knows magnetic north. You must keep the map oriented and keep track.

Declination: the angle between magnetic north and true/grid north. Set it on the compass if it has an adjuster, or add/subtract every time. A 15 degree error is about 400 meters off in 1.5 km.

To walk a bearing: put the compass on the map from you to the target, rotate the housing to grid north, add declination as required, then hold the compass at your belly and walk to a picked object on that line. Repeat. Do not stare at the needle while you trip.

Resection (rough): identify two (better three) known features you can see, shoot back-bearings, draw them on the map; you are near the intersection. Terrain association — matching ridges and drainages — is faster when visibility is good.

Pace count: know your double-paces per 100 meters on flat, uphill, and night. Use beads or pebbles. Fatigue shortens pace.

At night or in fog, short legs to handrails (streams, ridges, roads) beat a 5 km heroic bearing.
""",
    ))

    docs.append(doc(
        "navigation-no-compass",
        "Direction without a compass",
        "navigation",
        cache,
        "CC0",
        ["sun", "stars", "direction"],
        """
These methods are crude. Use them to pick a cardinal direction, not to thread a boulder field.

Shadow-stick (day): plant a stick, mark the tip of the shadow, wait 15–20 minutes, mark again. The first to second mark runs west to east in most latitudes. A line perpendicular gives north-south.

Watch method (analog): in the northern hemisphere, point the hour hand at the sun; south is halfway to 12 (or 1 during daylight time). Digital watches do not count.

Night: Polaris is over true north, found via the two pointer stars of the Big Dipper. In the southern hemisphere, the Southern Cross points toward south with a bit of construction — learn it before you need it.

Moss on trees is a rumor, not a method. Prevailing wind and satellite dishes are local gossip.

If you have a phone with a saved offline map but no GNSS, you can still orient the map to terrain. Last-known plus terrain is better than a guess.
""",
    ))

    docs.append(doc(
        "signaling-rescue",
        "Signaling: ground-to-air and sound",
        "signaling",
        fm,
        "US Government public domain",
        ["signal", "whistle", "mirror", "sos"],
        """
Three of anything is a distress pattern in many wilderness contexts: three whistle blasts, three fires, three flashes.

Whistle: louder and cheaper than shouting. Carry one on the zipper. Blast, rest, blast.

Signal mirror: aim the flash on your hand, then onto the aircraft or a far ridge. Practice before you need it. A phone screen can work poorly in weak sun.

Ground-to-air: large contrasting V, X, or SOS in an opening. X is a common “need help” panel signal. Size matters — think many meters, not a stick in the dirt. Stay near the signal.

Fires: three in a triangle if fuel and law allow. Have tinder ready; light when you hear a bird, not after it has passed.

Color and motion: a bright tarp waved, a laser (do not dazzle pilots on final), strobe at night.

If you have any radio or messenger, send a short message: who, how many, injuries, location (coordinates + description), and what you will do next. Then conserve battery. Do not spam.
""",
    ))

    docs.append(doc(
        "fema-kit",
        "Home and go-bag: FEMA-style kit",
        "disaster",
        fema,
        "US Government public domain",
        ["kit", "go-bag", "fema"],
        """
FEMA’s public guidance for household preparedness is boring and correct: water, food, light, comms, meds, documents, and a plan that someone else knows.

Water: one gallon (4 L) per person per day, three days minimum at home, more in heat. Do not forget pets.

Food: three days of no-cook calories you will actually eat. Manual can opener.

Light and power: flashlight, extra batteries, headlamp. A small radio (hand-crank or battery) for public alerts when the phone network dies.

Medical: a real first-aid kit plus 7 days of prescription meds if you can, glasses, and child/infant needs.

Sanitation: bags, bleach, soap, menstrual supplies.

Documents: paper copies of IDs, insurance, and a meeting place written down. Phones die and clouds vanish in a regional outage.

Go-bag extras: sturdy shoes, weather layer, N95 or better if smoke/ash is a local risk, cash in small bills, and a paper map of your region.

This app does not replace a kit. It does replace the assumption that search will always work on the first afternoon.
""",
    ))

    docs.append(doc(
        "earthquake",
        "Earthquake: drop, cover, hold, then after",
        "disaster",
        fema,
        "US Government public domain",
        ["earthquake", "aftershock"],
        """
Indoors: drop, cover, hold on under a table or against an interior wall. Stay away from glass and tall furniture. Do not run outside through a facade of glass. Do not stand in a doorway as a plan — modern interior doorways are not magic.

In bed: stay, cover the head with a pillow, unless a heavy fixture can fall on you.

Outdoors: move away from buildings, power lines, and overpasses.

In a car: pull over away from bridges and power lines, stay inside.

After: expect aftershocks. Extinguish only small fires. Shut gas off only if you smell it or the meter says so and you know the valve — once off, utility must restore it. Do not use elevators. Check for downed lines. Text instead of call if networks are congested.

Tsunami country: if you feel a long quake, see the water recede, or hear an official siren, go to high ground on foot immediately. Do not wait for a push notification.
""",
    ))

    docs.append(doc(
        "flood-flash",
        "Flood and flash flood",
        "disaster",
        fema,
        "US Government public domain",
        ["flood", "water", "car"],
        """
Turn around, don’t drown. A short stretch of moving water can float a car. Two feet of water moves most sedans. Do not drive through barricades.

On foot, floodwater hides holes, debris, and sewage. If water is rising in a drainage at night, abandon gear and climb a side slope.

At home: move to higher floors with a go-bag if told to shelter. Do not go to the attic without an exit (axe, window). Shut power at the breaker if water is about to reach outlets and you can do so dry.

After: assume contamination. Boil water until told otherwise. Do not run generators indoors or in garages — carbon monoxide. Document damage with photos when safe.

Camp rule: never sleep in a beautiful flat wash because the sky is clear overhead. The storm can be 20 km upstream.
""",
    ))

    docs.append(doc(
        "wildfire",
        "Wildfire and smoke",
        "disaster",
        fema,
        "US Government public domain",
        ["fire", "smoke", "evac"],
        """
If officials say leave, leave early. Embers travel ahead of the flame front and close roads.

If you are caught on foot: do not run uphill from a fire if you can flank to a road, river, or already-burned black. Avoid canyons that chimney. Cover the mouth with cloth. A last-ditch survival zone is a depression in already-burned ground, face down, airway protected — this is desperate, not a plan.

Vehicles: park off the road in a clear area, windows up, vents off, headlights on, get as low as possible. Metal and glass beat running through flame if you are already enveloped — still a last resort.

Smoke: N95 or better, limit exertion, indoor air if you have it. Children and people with lungs/heart disease need to leave smoky valleys sooner.

House: hose and sprinklers are not a stay-and-defend plan for untrained families. Close vents, remove doormats, and go.
""",
    ))

    docs.append(doc(
        "storm-lightning",
        "Severe storm and lightning",
        "disaster",
        fema,
        "US Government public domain",
        ["lightning", "storm", "tornado"],
        """
Lightning: there is no safe place outside. Avoid ridges, isolated trees, open water, and metal fences. If caught, crouch on your pad with feet together, not lying flat, away from the tallest object. Spread a group out so one strike does not drop everyone. A person struck can be touched; start CPR if needed.

Thunderstorms in mountains often peak in the afternoon. Be off summits before they build.

Tornado: lowest floor, interior room, no windows. Overpasses are not shelters. In a vehicle, leave it for a ditch only if the tornado is upon you and there is no building.

Hurricane / cyclone: follow evacuation orders. Inland flooding and storm surge kill more than wind. After landfall, treat downed lines and chainsaw work as skilled jobs.

Hail and cold rain: hypothermia risk in summer alpine. Pack a hard-shell even on “nice” mornings.
""",
    ))

    docs.append(doc(
        "power-outage",
        "Grid-down at home: power and heat",
        "off-grid",
        fema,
        "US Government public domain",
        ["power", "generator", "outage"],
        """
First hour: check on medically fragile people. Phones: one device on, the rest off. A battery pack beats a dead cluster of glowing screens.

Heat in winter: close unused rooms, hang blankets over windows, wear layers, crack a window if you use any combustion. Never run a generator, grill, or camp stove in the house or garage. Carbon monoxide kills families every outage season.

Cooling in summer: shade, night flushing if outdoor air is cooler, drink water, check on elderly neighbors. A car with fuel can be a cooling shelter if you stay aware of carbon monoxide and fuel limits — not in a closed garage.

Food: keep fridge closed. A full freezer holds ~48 hours if unopened; a fridge ~4 hours. When in doubt, throw out meat that warmed.

Water: if the utility is down, the water heater tank is a reserve (shut incoming valve first). Toilet tank (not bowl) is another, if no chemical cleaner is in it.

Light: headlamps keep hands free. Candles start house fires — use them in a metal pot or not at all.
""",
    ))

    docs.append(doc(
        "sanitation-hygiene",
        "Sanitation when the plumbing dies",
        "hygiene",
        cdc,
        "US Government public domain",
        ["sanitation", "waste", "hygiene"],
        """
Disease will outrun hunger in a crowded outage.

Handwashing: soap and water still win. An alcohol rub needs clean-looking hands and enough volume to dry slowly.

Latrine: 60+ meters from water and camp, 20+ cm deep cat-holes in small groups. For longer stays, a trench latrine downhill and downwind. Pack out paper in fragile ecosystems where required.

Bucket toilet: bag, absorb (sawdust, kitty litter), seal, store away from food. Do not dump bags in the river.

Menstrual and child waste: plan the kit, not improvisation with a single cloth and no wash water.

Food hygiene: boil, keep raw meat separate (or skip meat), and do not share unwashed bottles after a stomach bug. Oral rehydration: 1 liter clean water, 6 teaspoons sugar, 1/2 teaspoon salt — if you have the ingredients and the person is not vomiting uncontrollably. Seek care for bloody diarrhea, high fever, or a limp child.
""",
    ))

    docs.append(doc(
        "plants-poison-ivy",
        "Poison ivy, oak, and sumac",
        "plants-animals",
        cdc,
        "US Government public domain",
        ["poison ivy", "urushiol", "rash"],
        """
Leaves of three, let it be — a start, not a complete ID. Poison ivy and oak have three leaflets; poison sumac has rows of leaflets and lives in wet ground. Urushiol oil binds to skin in minutes.

Do not burn the plant. Smoke carries the oil to lungs and eyes.

If exposed: rinse with soap and cold water as soon as you can. Rubbing alcohol or specialized wipes help if used early. Do not aggressively scrub with hot water (opens pores).

Clothes, tools, and dog fur hold oil. Wash them separately.

Rash is an immune reaction, often 12–48 hours later, and can look like streaks. Over-the-counter hydrocortisone and oral antihistamines are comfort only. Face, genitals, or severe swelling: medical care. Do not use home bleach on skin.
""",
    ))

    docs.append(doc(
        "snakes-bites",
        "Venomous snakebite field care",
        "plants-animals",
        cdc,
        "US Government public domain",
        ["snake", "bite", "venom"],
        """
Get the person away from the snake. Do not hunt the snake for a trophy photo if it puts another person in range. A phone picture from a safe distance can help a clinician.

Field care: keep the person calm and still. Remove rings. Immobilize the limb at heart level if practical. Walk out only if you must and can do it slowly. Evacuate.

Do not cut, suck, apply a tourniquet, pack in ice, or drink alcohol. Do not use venom extractors as a plan. They waste time.

Note the time and the progression of swelling. Allergic and dry bites both exist; you cannot sort them in the dirt.

Prevention: flashlight at night, hands not in holes, stepping on logs not over them blindly, giving every snake an exit.
""",
    ))

    docs.append(doc(
        "ticks-mosquitoes",
        "Ticks, mosquitoes, and vector disease",
        "plants-animals",
        cdc,
        "US Government public domain",
        ["tick", "mosquito", "lyme"],
        """
Permethrin on clothing (dried, not on skin) and DEET or picaridin on skin reduce bites. Pants in socks in tick country. Check the warm hidden places at night: scalp, groin, armpits, behind knees, waistband.

Tick removal: fine tweezers, grab at the skin, steady pull. Do not twist with a match or petroleum jelly. Save the tick in a bag. Clean the site.

Watch 30 days for a bull’s-eye rash, fever, or joint pain. Early care matters. This app cannot diagnose Lyme or Rocky Mountain spotted fever.

Mosquitoes: standing water, dusk, and malaria/dengue/WNV risk vary by region. A head net weighs nothing. In malaria country, prophylaxis is a clinician decision made before the trip, not a leaf tea.
""",
    ))

    docs.append(doc(
        "mushrooms-do-not",
        "Mushrooms: why field tests fail",
        "plants-animals",
        cache,
        "CC0",
        ["mushroom", "amanita", "forage"],
        """
There is no folk test that separates edible mushrooms from deadly ones. Silver spoons, whether animals ate it, whether it peels, and whether it bruises blue are all folklore.

Amanita phalloides (death cap) tastes fine and has a delayed liver failure measured in days. By the time you feel poisoned, the damage is underway. Gyromitra (false morel) has its own toxin.

If you did not know the species before the trip, you do not know it now. Eat the rice.

If someone may have eaten a toxic mushroom: save a sample, note the time, and get to medical care even if they feel well. Do not wait for vomiting.

Photograph cap, gills or pores, stem, base (dig, do not pick only the cap), and habitat if you are documenting for a clinician — not to justify dinner.
""",
    ))

    docs.append(doc(
        "knots-cordage",
        "Cordage and five knots that earn their keep",
        "tools",
        cache,
        "CC0",
        ["knot", "cordage", "lash"],
        """
Carry 15–30 m of real cord (3 mm+). Bank line or accessory cord beats flimsy kits.

Bowline: a fixed loop that is easy to undo. Dress it; finish with a backup if life depends on it (and do not use a single bowline as a climbing tie-in unless that is your trained system).

Figure-eight on a bight: stronger, bulkier loop.

Clove hitch: start of lashings and ridgelines, backup it.

Trucker’s hitch: tarp tension. Leave a little stretch in nylon so a storm does not snap the line.

Prusik or taut-line: adjustable along a line.

Square lashing: two poles at right angles. Timber hitch to start a diagonal.

Cut cord only when you must. A melted nylon end will not unravel. Natural cordage (inner bark, grass) is slow and weak — a winter project, not a bleeding-stopper.
""",
    ))

    docs.append(doc(
        "repair-kit",
        "Field repair of gear",
        "tools",
        cache,
        "CC0",
        ["repair", "tape", "sewing"],
        """
A tiny repair kit: needle, Kevlar or polyester thread, tenacious tape, a scrap of fabric, zip ties, a bit of wire, epoxy putty, a multi-tool, and cord.

Tents: tape the rip, then stitch if you have time, then tape over the stitches. A pole sleeve from a stick and tape will limp home.

Sleeping pads: alcohol wipe, then the manufacturer patch. A bag of water in the pad finds bubbles.

Stoves: clear the jet with the right tool, not a random wire that opens the orifice. Carry one backup ignition.

Electronics: bags of rice are a myth for drowned phones. Power off, open ports, dry in moving air. Do not charge a wet pack.

Boots: stitch and glue delams; a gaiter plus tape will hold a sole for a walk-out. Blisters from a repair are a second problem — fix the hot spot the same hour.

If a repair involves fuel or pressure vessels, skip cleverness. Walk out.
""",
    ))

    docs.append(doc(
        "legal-public-lands",
        "Public-land basics (United States, not legal advice)",
        "legal",
        "CACHE original summary of common U.S. public-land rules. Not legal advice, not complete.",
        "CC0",
        ["legal", "public land", "fire"],
        """
This is not legal advice and is not complete. Rules change by unit and season.

National forests and BLM: dispersed camping is often allowed with limits on stay length, distance from water and roads, and fire restrictions. State and local fire bans override your campfire skill.

National parks: camping is usually in designated sites only. Collecting plants, rocks, and cultural items is generally illegal.

Wilderness: motors and often bicycles are restricted. Group size caps exist.

Leave No Trace is ethics plus, in many places, regulation: pack out trash, bury human waste correctly or pack it out, do not cut live trees.

Hunting and fishing require licenses and seasons. “Survival” is not a blanket exemption.

Crossing private land without permission is trespass even if your map app draws a pretty line. If you must leave a flood or fire, do so, then contact the owner or agency when you can.

International borders, tribal lands, and military reservations have their own rules. Download the unit’s official rules in the library pack before you go offline.
""",
    ))

    docs.append(doc(
        "lost-person-behavior",
        "If someone else is lost",
        "signaling",
        cache,
        "CC0",
        ["lost", "search", "child"],
        """
Note the last seen point, time, clothing, and intended route. That point is gold. Do not trample it.

Call official search and rescue sooner than your pride wants. Give: name, age, medical issues, clothing, plan, last seen, map datum if you have coordinates.

Do not send the rest of the family fanning out in the dark unless you are trained and have a stay-behind at camp. Untrained searchers become additional lost persons.

Children often go to ground near a trail or a hide. Call, then listen longer than feels natural. Whistle, wait.

Mark your own track. Leave a note at the car. Keep a phone on a schedule, not dying at 3 percent when the helicopter asks for a grid.
""",
    ))

    docs.append(doc(
        "water-crossing",
        "River crossings",
        "navigation",
        fm,
        "US Government public domain",
        ["river", "ford", "crossing"],
        """
Look upstream for a wider, shallower braid. Avoid bends, strainers (downed trees), and anything you cannot see the bottom of.

Unbuckle pack waist and chest belts so you can shed. Face upstream, sidestep, use a pole on the downstream side as a third leg — or face slightly into current, depending on training. Groups can line up, weaker in the middle.

If you fall, feet downstream, on your back, to fend rocks, then swim for an eddy. Ditch the pack if it drowns you.

Do not cross in flood, at dusk, or when teeth chatter from cold before you start. Hypothermia after a “successful” crossing is common.

A log over moving water is a fall onto a strainer. Sit and scoot only if it is huge and dry and you have no better ford.
""",
    ))

    docs.append(doc(
        "desert-travel",
        "Desert travel and vehicle breakdown",
        "climate",
        fm,
        "US Government public domain",
        ["desert", "vehicle", "shade"],
        """
Stay with a broken vehicle if it is on a route that will be searched. The car is shade, metal for signaling, and a larger object than you.

If you must walk, walk at night if terrain allows, mark the vehicle, leave a note, and carry more water than feels ridiculous. Rest in a scraped shade trench under a tarp during the day.

Radiator water may contain toxic additives — last resort only, and still a chemical risk. Do not drink the windshield fluid.

Sand: lower tire pressure if you know how to reseat a bead; a shovel and recovery boards beat spinning into a grave. Never camp in a wash.

Sun: long sleeves, neck cover, dark UV-rated glasses. A white tarp over the car interior drops the oven effect.
""",
    ))

    docs.append(doc(
        "coast-surf",
        "Coast, tide, and cold water",
        "climate",
        cache,
        "CC0",
        ["tide", "surf", "hypothermia"],
        """
Tide tables matter more than bravery. A beach that is wide at noon can be a cliff at dusk. Note escape gullies before you walk a “just around the headland” photo.

Rip currents: do not fight straight in. Swim sideways to the rip, then in. Float and signal if you cannot swim out.

Cold water: even strong swimmers last minutes to tens of minutes in high-latitude seas. Help-and-huddle, keep clothes on, and get dry windproof layers on the moment you land. A “quick swim” without a plan is how competent people die.

Shellfish and red tide: local closures exist for a reason. Do not free-dive dinner after a bloom rumor.

This is not a seamanship manual. Do not put to sea in a scavenged boat because an app said you could.
""",
    ))

    docs.append(doc(
        "urban-outage",
        "Urban grid-down movement",
        "disaster",
        fema,
        "US Government public domain",
        ["urban", "outage", "security"],
        """
Most urban outages are boring: dark stairwells, dead pumps, short tempers. The risk is secondary — falls, CO from generators, spoiled food, blocked roads, and crime of opportunity, not a movie.

Move in daylight if you can, with a written destination and an alternate. Tell someone. Carry ID. Avoid flooded underpasses and hanging lines.

Do not become a rumor node. Use a radio or official notices when they exist. This app will not invent a live news feed while air-gapped.

Neighbors with medical skills and spare water beat a lone “operator” loadout. Check on the apartment that never opens its door.

If you must leave the city, leave early, on a full tank, with paper maps. Highways become parking lots. Side streets plus walking is a plan; arguing with a closed ramp is not.
""",
    ))

    docs.append(doc(
        "children-elderly",
        "Children, infants, and older adults in the field",
        "medical",
        cdc,
        "US Government public domain",
        ["child", "infant", "elderly"],
        """
Children cool and heat faster, dehydrate faster, and cannot always report pain. Offer fluids on a schedule. Carry the snack they will eat. A stuffed toy is insulation and morale.

Infants: formula or breastmilk plans that do not depend on one clean bottle. No honey under one year. No field foraging.

Car seats still matter after disasters. A loose infant in a flooded cabin is a drowning.

Older adults: meds on a list, spare glasses, a week of prescriptions if possible, and someone who notices confusion. Heat and cold hit them first. A fall plus blood thinners is an evacuation.

Do not split a family in a crowd “to save time” without a written reunion point.
""",
    ))

    docs.append(doc(
        "mental-morale",
        "Fear, sleep, and group morale",
        "general",
        cache,
        "CC0",
        ["morale", "sleep", "fear"],
        """
Fear is information. Panic is unpaid overtime. Name the next 10-minute task out loud.

Sleep is a survival tool. Rotate watches. A group that does not sleep starts losing people to bad decisions, not to wolves.

Small rituals: hot drink, dry socks, a joke, a written plan for dawn. Creative mode in this app exists for a reason.

Suicidal talk, hopelessness after a death, or a person who stops speaking needs human care, not a pep talk from a language model. Stay with them, remove obvious means if you can do so safely, and get real help when any channel exists.

You are allowed to be not fine and still do the next right task.
""",
    ))

    docs.append(doc(
        "ocr-documents",
        "Using imported manuals with the local AI",
        "general",
        cache,
        "CC0",
        ["rag", "pdf", "library"],
        """
CACHE can answer from three local sources: the bundled field library, packs you download, and files you import (PDF, text, markdown).

Import only what you have a right to store. Prefer public-domain government PDFs (FEMA, CDC, many U.S. Army FMs) and your own notes.

After import, ask a specific question (“What is the wait time for chlorine dioxide?”) rather than “summarize this 400-page FM.” The retriever pulls short chunks and the model (if loaded) writes with citations.

If no model is loaded, you still get extractive excerpts. That is slower to read and more honest.

Delete packs and files in Settings when you need disk. Notes can be exported as text after you unlock the vault; they are never uploaded.
""",
    ))

    # More compact but still useful entries to thicken FTS
    extras = [
        ("nav-pacing", "Pacing and attack points", "navigation", ["pace", "attack point"],
         "Pick a catching feature beyond the target (a road, stream, cliff) so an overshoot is obvious. Count paces in 100 m sets. Reset at every attack point. Night pacing is shorter; mud is shorter; downhill is longer. If the catching feature does not appear, stop and resect — do not add another kilometer of hope."),
        ("nav-handrails", "Handrails, collecting features, and aiming off", "navigation", ["handrail", "aiming off"],
         "A handrail is a linear feature you can follow: ridge, power line, fence, shore. Aiming off: deliberately aim left of a hut on a long shore so you know to turn right when you hit the water. Collecting features stop you from walking forever. Draw them on the paper map before the weather arrives."),
        ("fire-wet", "Lighting fire in rain", "fire", ["rain", "fatwood"],
         "Standing dead wood is drier than the ground. Split to the dry core. Fatwood (resin-soaked pine) lights when everything else sulks. Build a roof with your body or a tarp, not over a sparking chimney. Start tiny. Feed slowly. A propane lighter in a bag beats a bow drill lecture."),
        ("fire-signal", "Signal fire vs cook fire", "fire", ["signal", "smoke"],
         "A cook fire is small and smokeless if you can. A signal fire is dirty on purpose: green leaves after you have a hot bed, in an opening, three if you have the fuel. Do not start a hillside that will become the next incident. Have water or dirt to kill it when the aircraft has you."),
        ("water-containers", "Containers and caching water", "food-water", ["bottle", "cache"],
         "Two one-liter bottles plus a dirty bag for scooping beats one giant bladder that fails. Mark caches on the map and on the ground. Bury shallow in shade, not in a wash. Never cache in a single unmarked bottle in a desert you cannot re-find. Treat cached water as dirty unless you sealed it yourself."),
        ("food-cook", "Cooking without a kitchen", "food-water", ["cook", "pot"],
         "Boil is the default: water, grains, questionable leftovers. A lid saves fuel. A windscreen halves boil time. Do not cook in galvanized or unknown metal. Charred meat is not sterile inside — split thick pieces. Let pots cool before you pack them against a filter membrane."),
        ("shelter-clothing", "Clothing as a system", "shelter", ["layer", "clothing"],
         "Base: move moisture. Mid: trap air (fleece, puffy). Shell: block wind and rain. Cotton kills in the cold when wet and is fine as a sun shirt in dry heat. Vent early so you do not soak the midlayer. Night: dry socks are worth more than a second knife. Gloves: a cheap pair plus a shell pair."),
        ("shelter-group", "Group bivouac", "shelter", ["group", "watch"],
         "Assign: fire, water, shelter, medical, watch. The loudest person is not automatically in charge. Put the injured in the warmest real estate. Keep packs as pillows and as a door plug. Agree on the dawn plan before you sleep so nobody wanders off at 0200 with the only map."),
        ("med-anaphylaxis", "Severe allergic reaction", "medical", ["anaphylaxis", "epinephrine"],
         "Hives plus trouble breathing, swelling of the tongue, or collapse after a sting or food is anaphylaxis. If the person has an epinephrine auto-injector, they use it as prescribed, then evacuate — epi wears off. Do not make the untrained inject random syringes. Remove a stinger by scraping. A second dose may be in their plan; this app will not invent one."),
        ("med-fractured-pelvis", "Pelvis and femur suspicion", "medical", ["pelvis", "femur"],
         "A crushed pelvis can hide a liter of blood. Do not log-roll for fun. Stabilize the legs together, treat for shock, evacuate. Do not stuff a homemade binder if you have never practiced — you can worsen a fracture. Femur: enormous pain, shortening, swelling. Traction is trained care. Your job is still bleeding, warmth, and a carry plan."),
        ("med-eye", "Eye injuries and debris", "medical", ["eye", "debris"],
         "Do not rub. Flush with clean water for a long time. If an object is stuck in the globe, stabilize it and cover both eyes so they stop tracking. Alkali (lime, some batteries) needs continuous flush and urgent care. Sunglasses after a snow day prevent more UV, they do not fix yesterday."),
        ("offgrid-solar", "Small solar and battery discipline", "off-grid", ["solar", "battery"],
         "A 10–20 W panel plus a known-good power bank can keep a phone and a headlamp alive if you actually park the panel in sun and keep ports dry. Charge at midday, use at night. One device on airplane mode with this app’s offline maps beats four devices scanning for a tower that is not there. Lithium packs hate heat on a car dash."),
        ("offgrid-water-catch", "Rain catch", "off-grid", ["rain", "tarp"],
         "A clean tarp into a clean bottle is excellent water if the tarp was not just a groundsheet. First-flush the dust. Do not catch off a roof that is asphalt-granule soup unless you will filter and still accept chemical risk. In lightning, you are holding a wet sheet on a ridge — maybe wait."),
        ("hygiene-teeth", "Teeth and small infections", "hygiene", ["teeth", "infection"],
         "A dental abscess can drop a strong walker. Saltwater rinses, ibuprofen if they already tolerate it, and a fast walk to care. Do not pack aspirin on a bleeding socket as folklore. Floss and a brush weigh less than a disaster. In the field, a clean cloth and water after sugary gels prevents a week of misery."),
        ("tools-knife", "Knife and axe safety", "tools", ["knife", "axe"],
         "Cut away from the femoral artery. Sit to carve. A sharp knife is safer than a dull one you lean into. Axe: clear the circle, plant the feet, use a chopping block, never work on a swinging branch over your shin. Sheath before you walk. A folding knife in a pocket without a lock is a future puncture."),
        ("tools-cord-repair", "Sewing a load-bearing strap", "tools", ["sew", "strap"],
         "Back a rip with a fabric patch. Use small tight stitches, not one heroic yank of dental floss. Bar-tack the ends. Tape is a helper, not the structure, on a hip belt that holds a 20 kg pack. Test in camp, not on the crux."),
        ("legal-radio", "Radios and beacons", "legal", ["radio", "plb", "inreach"],
         "A licensed ham radio is not a toy, and an unlicensed transmission on some bands is illegal. A PLB or satellite messenger is a distress tool — send accurate information, then stay put if you said you would. False alerts steal aircraft from real patients. This app never keys a radio for you."),
        ("plants-nettle-cattail", "Two commonly discussed wild plants", "plants-animals", ["nettle", "cattail"],
         "Stinging nettle (Urtica) and cattail (Typha) appear in many manuals as food after proper ID and cooking. They also have lookalikes and dirty-water risks. If you cannot name the plant in Latin and common name before the trip, skip it. This library will not talk you into a salad."),
        ("animals-predators", "Bears, big cats, and food storage", "plants-animals", ["bear", "food storage"],
         "You will not outrun a bear. Food storage rules exist: canister, hang, or lock where required. Cook away from the bed. If charged, species and region change the response (black bear vs grizzly). Learn the local agency page before you go offline. Do not sleep in the clothes you cooked in. A dog off-leash is not a bear plan."),
        ("animals-livestock", "Dogs, livestock, and rural roads", "plants-animals", ["dog", "cattle"],
         "Give livestock an exit. Do not get between a cow and a calf. Close gates you opened. Rural dogs: stand your ground, do not sprint, use a stick as a barrier not a club if you can. Report bites and start medical care — infection and rabies decisions belong to clinicians."),
        ("disaster-winter-storm", "Winter storm at home", "disaster", ["snow", "ice", "home"],
         "Pipe freeze: drip a faucet, open cabinets, know the shutoff. Heat: as in the outage note — no indoor combustion without venting. Travel: a full tank, a bag, and the humility to not pass a closed gate. After ice, treat every branch as armed. Generators stay outside, away from windows, dry, and fed with stored fuel that is not a living-room stack."),
        ("disaster-hazardous", "Unknown chemical smell or spill", "disaster", ["chemical", "spill"],
         "If the air hurts, leave upwind and uphill if the cloud is heavy, call official responders when you can. Do not “taste” to ID. Take clothes off if they are soaked in an unknown liquid, then seal them, then wash skin with water. This app cannot replace a placard lookup when you have no network — distance is the tool."),
        ("nav-gps-dead", "When GNSS lies or dies", "navigation", ["gps", "gnss"],
         "A phone GNSS can be 50–100 m off in canyons or under wet snow. Do not argue with a cliff. Trust terrain. Airplane mode still allows GNSS on many phones; it does not allow map downloads. Cache tiles before you leave. A dying phone: one fix, write the coordinates on paper, then off. Last-known in CACHE is for this moment."),
        ("general-ten-essentials", "The ten essentials, updated", "general", ["essentials", "kit"],
         "Navigation, light, sun protection, first aid, ignition, repair/tools, extra food, extra water, extra layers, and emergency shelter. Add: communication device appropriate to the area, and the skill to use each item. A gadget you have not practiced is a paperweight. This list does not make you immortal; it buys time."),
        ("general-trip-plan", "Leave a trip plan", "general", ["plan", "itinerary"],
         "Write: names, vehicle, plates, trailhead, route, camps, bailouts, and when to call SAR if you are not back. Give it to a human who will actually call. Update them if you change the plan. A GPX in the cloud they cannot open at 2 a.m. is not a trip plan. Paper still works when the group chat does not."),
        ("repair-water-filter", "A clogged filter", "tools", ["filter", "backflush"],
         "Backflush as the maker intended. Prefilter silty water. Do not let a hollow-fiber freeze — ice breaks the membrane and you will not see the holes. If it froze, retire it for microbes you care about. A clogged filter plus impatience becomes unfiltered drinking. Boil instead."),
        ("food-plants-universal-no", "Why the universal edibility test is a last-last resort", "food-water", ["edibility test"],
         "The classic test (touch, wait, lips, wait, mouth, wait, swallow a little, wait many hours) misses delayed organ toxins and will not save you from Amanita. It also assumes you have a day to be ill. Identification plus a known-edible species list prepared at home is the actual method. Hunger is not ID."),
        ("climate-altitude", "Altitude illness", "climate", ["altitude", "ams"],
         "Headache, nausea, poor sleep above a rise you are not used to can be acute mountain sickness. The treatment is descend. Do not ascend with worsening symptoms. HAPE and HACE (wet lungs, wet brain) are emergencies: down, now, plus real medical care. Diamox is a prescription, not a candy this app can dose. Hydration helps comfort; it does not cure HACE."),
        ("hygiene-water-wounds", "Do not wash wounds in the creek you drink", "hygiene", ["wound", "creek"],
         "Downstream of camp is for washing. Upstream is for scooping drink water you will treat. A wound rinsed in a cattle creek is an infection plan. Use treated water for irrigation even if it hurts your supply — a septic leg costs more water later."),
        ("legal-disclaimer", "Limits of this library and the local AI", "legal", ["disclaimer", "limits"],
         "CACHE is an offline companion. It can be wrong. It may cite a chunk that does not fit your climate or your body. It is not a doctor, lawyer, guide, or search commander. Government sources here are adapted, shortened, and possibly outdated. Check official publications when you have a channel. If this text and a current official order disagree, the official order wins."),
    ]

    for i, (eid, title, cat, tags, body) in enumerate(extras):
        src = cache if cat in {"general", "tools", "legal", "plants-animals"} else (cdc if cat in {"medical", "hygiene"} else fm)
        lic = "CC0" if src == cache else "US Government public domain"
        docs.append(doc(eid, title, cat, src, lic, tags, body))

    return docs


def download_geonames(dest: Path) -> list[dict]:
    url = "https://download.geonames.org/export/dump/cities15000.zip"
    print(f"Downloading {url}")
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            blob = r.read()
        with zipfile.ZipFile(BytesIO(blob)) as zf:
            name = [n for n in zf.namelist() if n.endswith(".txt")][0]
            raw = zf.read(name).decode("utf-8", errors="replace")
    except Exception as e:
        print(f"GeoNames download failed ({e}); using fallback capitals")
        return fallback_places()

    places = []
    for line in raw.splitlines():
        p = line.split("\t")
        if len(p) < 15:
            continue
        try:
            pop = int(p[14] or 0)
        except ValueError:
            pop = 0
        places.append({
            "id": p[0],
            "name": p[1],
            "country": p[8],
            "admin": p[10],
            "lat": float(p[4]),
            "lon": float(p[5]),
            "population": pop,
            "featureClass": p[6],
        })
    places.sort(key=lambda x: -x["population"])
    print(f"GeoNames places: {len(places)}")
    return places


def fallback_places() -> list[dict]:
    # Enough for tests / offline demo if GeoNames is blocked.
    seeds = [
        ("Denver", "US", "CO", 39.7392, -104.9903, 715522),
        ("New York", "US", "NY", 40.7128, -74.0060, 8336817),
        ("Los Angeles", "US", "CA", 34.0522, -118.2437, 3979576),
        ("Chicago", "US", "IL", 41.8781, -87.6298, 2693976),
        ("Houston", "US", "TX", 29.7604, -95.3698, 2320268),
        ("London", "GB", "ENG", 51.5074, -0.1278, 8961989),
        ("Paris", "FR", "IDF", 48.8566, 2.3522, 2148271),
        ("Tokyo", "JP", "13", 35.6762, 139.6503, 13960000),
        ("Sydney", "AU", "NSW", -33.8688, 151.2093, 5312163),
        ("Cape Town", "ZA", "WC", -33.9249, 18.4241, 433688),
        ("Nairobi", "KE", "110", -1.2921, 36.8219, 4397073),
        ("Reykjavik", "IS", "1", 64.1466, -21.9426, 131136),
        ("Anchorage", "US", "AK", 61.2181, -149.9003, 291247),
        ("Honolulu", "US", "HI", 21.3069, -157.8583, 350964),
        ("Oslo", "NO", "03", 59.9139, 10.7522, 693494),
    ]
    out = []
    for i, (name, cc, admin, lat, lon, pop) in enumerate(seeds):
        out.append({
            "id": str(i + 1),
            "name": name,
            "country": cc,
            "admin": admin,
            "lat": lat,
            "lon": lon,
            "population": pop,
            "featureClass": "P",
        })
    return out


def download_world(dest: Path) -> None:
    url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    print(f"Downloading {url}")
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            geo = json.load(r)
        slim = {"type": "FeatureCollection", "features": []}
        for f in geo.get("features", []):
            props = f.get("properties") or {}
            slim["features"].append({
                "type": "Feature",
                "properties": {
                    "name": props.get("NAME") or props.get("name") or "",
                    "iso": props.get("ISO_A3") or "",
                },
                "geometry": f.get("geometry"),
            })
        dest.write_text(json.dumps(slim, separators=(",", ":")))
        print(f"Wrote {dest} ({dest.stat().st_size} bytes)")
    except Exception as e:
        print(f"World download failed ({e}); writing tiny placeholder")
        dest.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {"name": "Demo", "iso": "DEM"},
                "geometry": {"type": "Polygon", "coordinates": [[[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]]]},
            }],
        }))


def cut_lakes_from_countries(world_path: Path, lakes_path: Path) -> None:
    """Punch lake polygons out of country land so the Great Lakes stay water at world zoom.

    Natural Earth admin-0 fills inland seas. A separate lake overlay gets simplified
    away at low zoom and Michigan disappears into a solid blob.
    """
    try:
        from shapely.geometry import shape, mapping
        from shapely.ops import unary_union
        from shapely.validation import make_valid
    except ImportError:
        print("shapely missing; leaving country polygons uncut")
        return
    if not world_path.exists() or not lakes_path.exists():
        print("skip lake cut; world or lakes file missing")
        return
    world = json.loads(world_path.read_text())
    lakes = json.loads(lakes_path.read_text())
    lake_geoms = []
    for f in lakes.get("features", []):
        geom = f.get("geometry")
        if not geom:
            continue
        g = make_valid(shape(geom))
        if not g.is_empty:
            lake_geoms.append(g)
    if not lake_geoms:
        return
    water = unary_union(lake_geoms)
    cut_n = 0
    for f in world.get("features", []):
        geom = f.get("geometry")
        if not geom:
            continue
        g = make_valid(shape(geom))
        if not g.intersects(water):
            continue
        diff = make_valid(g.difference(water))
        if diff.is_empty:
            continue
        if diff.geom_type == "GeometryCollection":
            polys = [p for p in diff.geoms if p.geom_type in ("Polygon", "MultiPolygon")]
            if not polys:
                continue
            diff = unary_union(polys)
        f["geometry"] = mapping(diff)
        cut_n += 1
    world_path.write_text(json.dumps(world, separators=(",", ":")))
    print(f"Cut lakes from {cut_n} countries -> {world_path} ({world_path.stat().st_size} bytes)")


def download_lakes(dest: Path) -> None:
    """Natural Earth 50m lakes — Great Lakes and other inland seas the 110m countries fill as land."""
    url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson"
    print(f"Downloading {url}")
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            geo = json.load(r)
        slim = {"type": "FeatureCollection", "features": []}
        for f in geo.get("features", []):
            props = f.get("properties") or {}
            slim["features"].append({
                "type": "Feature",
                "properties": {"name": props.get("name") or props.get("NAME") or ""},
                "geometry": f.get("geometry"),
            })
        dest.write_text(json.dumps(slim, separators=(",", ":")))
        print(f"Wrote {dest} ({dest.stat().st_size} bytes, {len(slim['features'])} lakes)")
    except Exception as e:
        print(f"Lakes download failed ({e}); writing empty collection")
        dest.write_text(json.dumps({"type": "FeatureCollection", "features": []}))


def main() -> None:
    docs = library()
    lib_path = OUT / "library-seed.json"
    lib_path.write_text(json.dumps(docs, indent=2))
    print(f"Library documents: {len(docs)} -> {lib_path}")

    places = download_geonames(OUT / "places.json")
    (OUT / "places.json").write_text(json.dumps(places, separators=(",", ":")))
    print(f"Places: {len(places)}")

    download_world(OUT / "world-110m.geojson")
    download_lakes(OUT / "lakes.geojson")
    cut_lakes_from_countries(OUT / "world-110m.geojson", OUT / "lakes.geojson")

    meta = {
        "libraryCount": len(docs),
        "placeCount": len(places),
        "builtAt": "2026-01-01",
    }
    (OUT / "manifest.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
