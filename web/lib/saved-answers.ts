/**
 * Real answers Gus gave to the tour's three questions (captured from production, 2026-10-31), for
 * people who'd rather not wait on the live model. Shown as saved, never passed off as live.
 */
import type { GusAnswer } from './gus';

export const SAVED: Record<string, GusAnswer> = {
  "Which night should I play Ithaca?": {
    "heard": "Which night should I play Ithaca?",
    "reply": "Friday, December 18. 4 of the 5 venues that suit you are open that night.",
    "mood": "proud",
    "action": {
      "type": "night",
      "id": "ithaca-ny",
      "name": "Ithaca",
      "current": "2026-12-17",
      "nights": [
        {
          "date": "2026-12-18",
          "day": "friday",
          "open": 4,
          "venues": 5
        },
        {
          "date": "2026-12-19",
          "day": "saturday",
          "open": 4,
          "venues": 5
        },
        {
          "date": "2026-12-17",
          "day": "thursday",
          "open": 4,
          "venues": 5
        }
      ],
      "label": "Pick a night in Ithaca"
    },
    "model": "saved",
    "steps": [
      {
        "id": "s1",
        "tool": "pick_night",
        "label": "Looking at which nights work in Ithaca",
        "source": "qloo",
        "status": "done",
        "found": "3 good nights",
        "ms": 149
      }
    ]
  },
  "Which venues in Burlington fit me?": {
    "heard": "Which venues in Burlington fit me?",
    "reply": "The Flynn, right where your people live in Downtown. It’s dark Saturday and Sundays, so route around that.",
    "mood": "proud",
    "action": {
      "type": "deal",
      "id": "burlington-vt",
      "name": "Burlington",
      "roomId": "50A110A0-75F0-4A4D-BE26-BB698E700408",
      "label": "Ask The Flynn for a date"
    },
    "model": "saved",
    "steps": [
      {
        "id": "s1",
        "tool": "rooms",
        "label": "Finding venues in Burlington",
        "source": "qloo",
        "status": "done",
        "found": "5 venues",
        "ms": 111
      }
    ]
  },
  "Where should I put posters in Burlington?": {
    "heard": "Where should I put posters in Burlington?",
    "reply": "Put them up at The Other Place and Olde Northender Pub. That’s where your fans in Burlington hang out.",
    "mood": "proud",
    "action": {
      "type": "spots",
      "id": "burlington-vt",
      "name": "Burlington",
      "spots": [
        {
          "id": "17B2017B-D46C-465C-B57C-91F86E641EF4",
          "name": "The Other Place",
          "neighborhood": "Old North End",
          "address": "4 N Winooski Ave #1 Burlington, VT 05401",
          "lat": 44.4806886,
          "lon": -73.21102239999999
        },
        {
          "id": "675AD65E-E4DC-4CA2-8D5D-3FAA3A7EA32B",
          "name": "Olde Northender Pub",
          "neighborhood": "Old North End",
          "address": "23 North St Burlington, VT 05401",
          "lat": 44.4843019,
          "lon": -73.2213524
        },
        {
          "id": "A6F1207A-086D-4BFE-AC0B-D7784B1D9246",
          "name": "Juniper Bar and Restaurant",
          "neighborhood": "Downtown",
          "address": "41 Cherry St Burlington, VT 05401",
          "lat": 44.478771099999996,
          "lon": -73.2174355
        },
        {
          "id": "EFB52D49-5453-494E-86C3-50AFB5335D52",
          "name": "Muddy Waters",
          "neighborhood": "Downtown",
          "address": "184 Main St Burlington, VT 05401",
          "lat": 44.47616,
          "lon": -73.211874
        }
      ],
      "label": "Pin 4 spots in Burlington"
    },
    "model": "saved",
    "steps": [
      {
        "id": "s1",
        "tool": "poster_spots",
        "label": "Finding where your fans hang out in Burlington",
        "source": "qloo",
        "status": "done",
        "found": "4 spots around Old North End and Downtown",
        "ms": 142
      }
    ]
  }
};
