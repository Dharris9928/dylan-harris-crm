import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const STAGE_COLUMNS = [
  { id: 'prospecting', label: 'Prospecting', color: 'bg-sky-500' },
  { id: 'qualification', label: 'Qualification', color: 'bg-amber-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-violet-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-emerald-500' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];

interface OpportunitiesKanbanViewProps {
  opportunities: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
}

export function OpportunitiesKanbanView({ opportunities, onUpdate }: OpportunitiesKanbanViewProps) {
  const columns = STAGE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = opportunities.filter(opp => opp.stage === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    await onUpdate(draggableId, { stage: newStage });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_COLUMNS.map(column => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold">{column.label}</h3>
              </div>
              <Badge variant="secondary">{columns[column.id]?.length || 0}</Badge>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? 'bg-accent/50' : 'bg-muted/20'
                  }`}
                >
                  {columns[column.id]?.map((opp, index) => (
                    <Draggable key={opp.id} draggableId={opp.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'shadow-lg' : ''}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-2">{opp.opportunity_name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {opp.companies?.company_name || 'No Company'}
                            </p>
                            {opp.amount && (
                              <p className="text-sm font-medium mb-2">
                                ${opp.amount.toLocaleString()}
                              </p>
                            )}
                            {opp.expected_close_date && (
                              <p className="text-xs text-muted-foreground">
                                Close: {format(new Date(opp.expected_close_date), 'MMM d, yyyy')}
                              </p>
                            )}
                            {opp.profiles && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {opp.profiles.first_name} {opp.profiles.last_name}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
