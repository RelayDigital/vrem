'use client';

import type {
  Announcements,
  DndContextProps,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import tunnel from 'tunnel-rat';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const t = tunnel();

export type { DragEndEvent } from '@dnd-kit/core';

type KanbanItemProps = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

type KanbanColumnProps = {
  id: string;
  name: string;
} & Record<string, unknown>;

type KanbanContextProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = {
  columns: C[];
  data: T[];
  activeCardId: string | null;
  overColumnId: string | null;
};

const KanbanContext = createContext<KanbanContextProps>({
  columns: [],
  data: [],
  activeCardId: null,
  overColumnId: null,
});

export type KanbanBoardProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md text-xs ring-2 transition-all',
        isOver ? 'ring-primary' : 'ring-transparent',
        className
      )}
      ref={setNodeRef}
      style={{ maxHeight: '100%' }}
    >
      {children}
    </div>
  );
};

export type KanbanCardProps<T extends KanbanItemProps = KanbanItemProps> = T & {
  children?: ReactNode;
  className?: string;
  /** Disable drag and drop for this card (read-only mode) */
  disabled?: boolean;
};

export const KanbanCard = <T extends KanbanItemProps = KanbanItemProps>({
  id,
  name,
  children,
  className,
  disabled = false,
}: KanbanCardProps<T>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });
  const { activeCardId } = useContext(KanbanContext) as KanbanContextProps;

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  // When disabled, don't attach drag listeners
  const dragProps = disabled ? {} : { ...listeners, ...attributes };

  return (
    <>
      <div style={style} {...dragProps} ref={setNodeRef}>
        <Card
          className={cn(
            'gap-4 rounded-md p-3 shadow-sm',
            !disabled && 'cursor-grab',
            disabled && 'cursor-default',
            isDragging && 'pointer-events-none cursor-grabbing opacity-30',
            className
          )}
        >
          {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
        </Card>
      </div>
      {activeCardId === id && !disabled && (
        <t.In>
          <Card
            className={cn(
              'cursor-grab gap-4 rounded-md p-3 shadow-sm ring-2 ring-primary',
              isDragging && 'cursor-grabbing',
              className
            )}
          >
            {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
          </Card>
        </t.In>
      )}
    </>
  );
};

export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> =
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'id'> & {
    children: (item: T) => ReactNode;
    id: string;
  };

export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  children,
  className,
  ...props
}: KanbanCardsProps<T>) => {
  const { data, activeCardId, overColumnId } = useContext(KanbanContext) as KanbanContextProps<T>;
  const filteredData = data.filter((item) => item.column === props.id);
  const items = filteredData.map((item) => item.id);
  // const showPlaceholder = activeCardId !== null && overColumnId === props.id;
  const showPlaceholder = false;

  return (
    <ScrollArea className="h-full overflow-hidden">
      <SortableContext items={items}>
        <div
          className={cn('flex size-full flex-col space-y-2 p-2', className)}
          {...props}
        >
          {filteredData.map(children)}
          {showPlaceholder && (
            <div className="rounded-md border-2 border-dashed border-primary bg-primary/5 p-3 min-h-[120px] flex flex-col gap-2 animate-pulse">
              <div className="h-4 bg-primary/20 rounded w-3/4"></div>
              <div className="h-3 bg-primary/10 rounded w-1/2"></div>
              <div className="flex gap-2 mt-2">
                <div className="h-6 w-16 bg-primary/10 rounded"></div>
                <div className="h-6 w-16 bg-primary/10 rounded"></div>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};

export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement>;

export const KanbanHeader = ({ className, ...props }: KanbanHeaderProps) => (
  <div className={cn('m-0 p-2 font-semibold text-sm', className)} {...props} />
);

export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, 'children'> & {
  children: (column: C) => ReactNode;
  className?: string;
  columns: C[];
  data: T[];
  onDataChange?: (data: T[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
  columns,
  data,
  onDataChange,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = data.find((item) => item.id === event.active.id);
    if (card) {
      setActiveCardId(event.active.id as string);
    }
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setOverColumnId(null);
      return;
    }

    const activeItem = data.find((item) => item.id === active.id);
    const overItem = data.find((item) => item.id === over.id);

    if (!(activeItem)) {
      setOverColumnId(null);
      return;
    }

    const activeColumn = activeItem.column;
    const overColumn =
      overItem?.column ||
      columns.find(col => col.id === over.id)?.id ||
      columns[0]?.id;

    // Set the over column ID for placeholder display
    if (overColumn) {
      setOverColumnId(overColumn);
    }

    if (activeColumn !== overColumn) {
      let newData = [...data];
      const activeIndex = newData.findIndex((item) => item.id === active.id);
      const overIndex = newData.findIndex((item) => item.id === over.id);

      newData[activeIndex].column = overColumn;
      newData = arrayMove(newData, activeIndex, overIndex);

      onDataChange?.(newData);
    }

    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);
    setOverColumnId(null);

    onDragEnd?.(event);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    let newData = [...data];

    const oldIndex = newData.findIndex((item) => item.id === active.id);
    const newIndex = newData.findIndex((item) => item.id === over.id);

    newData = arrayMove(newData, oldIndex, newIndex);

    onDataChange?.(newData);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
    setOverColumnId(null);
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = data.find((item) => item.id === active.id) ?? {};

      return `Picked up the card "${name}" from the "${column}" column`;
    },
    onDragOver({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dragged the card "${name}" over the "${newColumn}" column`;
    },
    onDragEnd({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dropped the card "${name}" into the "${newColumn}" column`;
    },
    onDragCancel({ active }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};

      return `Cancelled dragging the card "${name}"`;
    },
  };

  return (
    <KanbanContext.Provider value={{ columns, data, activeCardId, overColumnId }}>
      <DndContext
        accessibility={{ announcements }}
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        {/* Responsive horizontal scroll: different column counts per breakpoint */}
        <div className="h-full w-full overflow-x-auto overflow-y-hidden scroll-smooth">
          <div
            className={cn(
              // Always use flex with horizontal scroll and gap
              'flex h-full flex-row gap-2 min-h-0',
              // Large screens: switch to grid with all columns visible
              '2xl:grid 2xl:size-full 2xl:auto-cols-fr 2xl:grid-flow-col 2xl:gap-4 2xl:overflow-x-visible',
              className
            )}
          >
            {columns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  // Mobile & Small (< 768px): 1 column visible, full width
                  'flex-[0_0_100%]',
                  // Medium (md, 768px+): 2 columns visible
                  'md:flex-[0_0_calc(50%-0.25rem)]',
                  // Large (lg, 1024px+): 3 columns visible
                  'lg:flex-[0_0_calc(33.333%-0.333rem)]',
                  // Extra Large (xl, 1280px+): 4 columns visible
                  'xl:flex-[0_0_calc(25%-0.375rem)]',
                  // 2XL (1536px+): Grid takes over, auto-sized columns
                  '2xl:flex-none 2xl:min-w-0',
                  // Height constraint to prevent expansion
                  'h-full min-h-0'
                )}
              >
                {children(column)}
              </div>
            ))}
          </div>
        </div>
        {typeof window !== 'undefined' &&
          createPortal(
            <DragOverlay>
              <t.Out />
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </KanbanContext.Provider>
  );
};