import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface OpportunitiesCalendarViewProps {
  opportunities: any[];
  onSelectEvent: (opportunity: any) => void;
}

const statusColors: Record<string, string> = {
  prospecting: '#3b82f6',
  qualification: '#8b5cf6',
  proposal: '#eab308',
  negotiation: '#f97316',
  closed_won: '#22c55e',
  closed_lost: '#ef4444',
};

export function OpportunitiesCalendarView({ opportunities, onSelectEvent }: OpportunitiesCalendarViewProps) {
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const events = opportunities
    .filter(opp => opp.expected_close_date)
    .map(opp => ({
      id: opp.id,
      title: opp.opportunity_name,
      start: new Date(opp.expected_close_date),
      end: new Date(opp.expected_close_date),
      resource: opp,
    }));

  const eventStyleGetter = (event: any) => {
    const color = statusColors[event.resource.stage] || '#6b7280';
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
    onSelectEvent(event.resource);
  };

  return (
    <>
      <div className="h-[calc(100vh-250px)] bg-card p-4 rounded-lg border">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          view={currentView}
          onView={setCurrentView}
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.opportunity_name}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company</label>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.companies?.company_name || 'No Company'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Stage</label>
                <div className="mt-1">
                  <Badge className={`bg-[${statusColors[selectedEvent.stage]}]`}>
                    {selectedEvent.stage?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              {selectedEvent.amount && (
                <div>
                  <label className="text-sm font-medium">Value</label>
                  <p className="text-sm text-muted-foreground">
                    ${selectedEvent.amount.toLocaleString()}
                  </p>
                </div>
              )}
              {selectedEvent.profiles && (
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.profiles.first_name} {selectedEvent.profiles.last_name}
                  </p>
                </div>
              )}
              {selectedEvent.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm text-muted-foreground">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
