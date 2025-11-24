
const events = [
  {
    id: '1',
    title: 'Event A',
    start: '2023-11-23T11:00:00',
    end: '2023-11-23T12:30:00',
  },
  {
    id: '2',
    title: 'Event B',
    start: '2023-11-23T14:00:00',
    end: '2023-11-23T17:20:00',
  },
  // Add a pair of overlapping events earlier in the day to trigger maxOverlapping > 1
  {
    id: '3',
    title: 'Event C',
    start: '2023-11-23T09:00:00',
    end: '2023-11-23T10:00:00',
  },
  {
    id: '4',
    title: 'Event D',
    start: '2023-11-23T09:00:00',
    end: '2023-11-23T10:00:00',
  }
];

function parseISO(s) {
  return new Date(s);
}

function eventsOverlap(event1, event2) {
  const start1 = parseISO(event1.start);
  const end1 = parseISO(event1.end);
  const start2 = parseISO(event2.start);
  const end2 = parseISO(event2.end);

  return start1 < end2 && start2 < end1;
}

// Logic from DayView.tsx
const technicianEvents = events;

const maxOverlapping = Math.max(
  1,
  ...technicianEvents.map((event) => {
    const overlapping = technicianEvents.filter((e) =>
      eventsOverlap(e, event)
    );
    return overlapping.length;
  })
);

console.log('maxOverlapping:', maxOverlapping);

technicianEvents.forEach(event => {
  const overlappingEvents = technicianEvents.filter((e) =>
    eventsOverlap(e, event)
  );

  const sortedOverlapping = [...overlappingEvents].sort(
    (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()
  );

  const overlapIndex = sortedOverlapping.findIndex((e) => e.id === event.id);
  const numOverlapping = sortedOverlapping.length;

  let colSpan;
  let colStart;

  if (numOverlapping === 1) {
    colSpan = maxOverlapping;
    colStart = 1;
  } else {
    colSpan = Math.floor(maxOverlapping / numOverlapping);
    colStart = overlapIndex * colSpan + 1;
  }

  console.log(`Event ${event.title}: numOverlapping=${numOverlapping}, colSpan=${colSpan}, colStart=${colStart}`);
});
