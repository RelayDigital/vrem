
const events = [
  // Scenario: Two events for different technicians that do NOT overlap in time
  {
    id: '1',
    title: '1234 Bridgeland (Marcus)',
    start: '2023-11-23T11:00:00',
    end: '2023-11-23T12:30:00',
    technicianId: 'marcus'
  },
  {
    id: '2',
    title: '5678 8th Avenue (Jennifer)',
    start: '2023-11-23T14:00:00',
    end: '2023-11-23T17:20:00',
    technicianId: 'jennifer'
  },
  // Scenario: Two events that DO overlap
  {
    id: '3',
    title: '9012 Elbow Park (Jennifer)',
    start: '2023-11-23T09:00:00',
    end: '2023-11-23T11:30:00',
    technicianId: 'jennifer'
  },
  {
    id: '4',
    title: '3456 Kensington (David)',
    start: '2023-11-23T11:00:00',
    end: '2023-11-23T12:30:00',
    technicianId: 'david'
  }
];

function parseISO(s) {
  return new Date(s);
}

// Copy of the logic from lib/calendar-utils.ts
function calculateEventLayout(events) {
  const layoutMap = new Map();
  
  // 1. Sort events by start time, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = parseISO(a.start).getTime() - parseISO(b.start).getTime();
    if (startDiff !== 0) return startDiff;
    return parseISO(b.end).getTime() - parseISO(a.end).getTime();
  });

  // 2. Group events into connected clusters
  const clusters = [];
  let currentCluster = [];
  let clusterEnd = 0;

  sortedEvents.forEach((event) => {
    const start = parseISO(event.start).getTime();
    const end = parseISO(event.end).getTime();

    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = end;
    } else {
      if (start < clusterEnd) {
        // Overlaps with current cluster
        currentCluster.push(event);
        clusterEnd = Math.max(clusterEnd, end);
      } else {
        // New cluster
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = end;
      }
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. Process each cluster
  clusters.forEach((cluster) => {
    // Simple column packing algorithm
    const columns = [];
    
    cluster.forEach((event) => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const lastEventInColumn = column[column.length - 1];
        // Check if this event can fit in this column (starts after the last one ends)
        if (parseISO(event.start).getTime() >= parseISO(lastEventInColumn.end).getTime()) {
          column.push(event);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
      }
    });

    // Calculate width and position
    const numColumns = columns.length;
    const width = 100 / numColumns;

    columns.forEach((column, colIndex) => {
      column.forEach((event) => {
        layoutMap.set(event.id, {
          left: colIndex * width,
          width: width,
        });
      });
    });
  });

  return layoutMap;
}

// Run layout on ALL events together (Unified View)
const layoutMap = calculateEventLayout(events);

events.forEach(event => {
  const layout = layoutMap.get(event.id);
  console.log(`Event ${event.title}: left=${layout.left}%, width=${layout.width}%`);
});
