import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import AnimatedSection from "@/components/ui/AnimatedSection";
import RsvpButton from "@/components/events/RsvpButton";
import EventShareButtons from "@/components/events/EventShareButtons";
import { supabase } from "../integrations/superbase/client";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

export default function Events() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    supabase.from("events").select("*").eq("status", "published").order("start_datetime", { ascending: true })
      .then(({ data }) => setEvents(data || []));
  }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  const upcomingEvents = events.filter(e => new Date(e.start_datetime) >= today);

  const eventsFor = (d: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return events.filter(e => e.start_datetime.startsWith(ds));
  };

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const selectedDateEvents = selectedDate ? events.filter(e => e.start_datetime.startsWith(selectedDate)) : [];

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const getEventUrl = (evt: any) => `https://weareplasmadoc.co.uk/events#${evt.id}`;

  return (
    <main id="main">
      <PageHero title="Events & Activities" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Events" }]} />
      <section className="section-padding bg-background">
        <div className="container mx-auto">
          {/* Upcoming Events */}
          <AnimatedSection className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8">Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground">No upcoming events. Check back soon!</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {upcomingEvents.slice(0, 6).map((evt) => {
                  const d = new Date(evt.start_datetime);
                  return (
                    <div key={evt.id} className="card-wapm p-6 min-w-[300px] flex-shrink-0" id={evt.id}>
                      <div className="flex gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary leading-none">{d.getDate()}</span>
                          <span className="text-[9px] font-semibold text-primary uppercase">{monthNames[d.getMonth()]?.slice(0, 3)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm">{evt.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.location || "TBC"} · <Clock className="w-3 h-3" /> {formatTime(evt.start_datetime)}</p>
                        </div>
                      </div>
                      {evt.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{evt.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <RsvpButton event={evt} size="sm" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <EventShareButtons eventName={evt.title} eventUrl={getEventUrl(evt)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatedSection>

          {/* Selected event detail */}
          {selectedEvent && (
            <AnimatedSection className="mb-16">
              <div className="card-wapm p-8 max-w-3xl mx-auto" id={selectedEvent.id}>
                <button onClick={() => setSelectedEvent(null)} className="text-sm text-primary hover:underline mb-4 inline-flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back to calendar
                </button>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedEvent.title}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(selectedEvent.start_datetime)} at {formatTime(selectedEvent.start_datetime)}</span>
                  {selectedEvent.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedEvent.location}</span>}
                </div>
                {selectedEvent.description && <p className="text-muted-foreground mb-6">{selectedEvent.description}</p>}
                <div className="flex items-center gap-4 mb-4">
                  <RsvpButton event={selectedEvent} />
                </div>
                <EventShareButtons eventName={selectedEvent.title} eventUrl={getEventUrl(selectedEvent)} />
              </div>
            </AnimatedSection>
          )}

          {/* Calendar */}
          <AnimatedSection>
            <div className="card-wapm p-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <button onClick={prev} className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" aria-label="Previous month">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-semibold text-primary">{monthNames[month]} {year}</h3>
                <button onClick={next} className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" aria-label="Next month">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase py-2">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = eventsFor(day);
                  const hasEvents = dayEvents.length > 0;
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button key={day} onClick={() => hasEvents && setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 ${
                        isSelected ? "bg-primary text-primary-foreground" :
                        isToday ? "bg-secondary text-secondary-foreground font-bold" :
                        hasEvents ? "hover:bg-muted cursor-pointer" : ""
                      }`}>
                      {day}
                      {hasEvents && !isSelected && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
              {selectedDateEvents.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border space-y-4">
                  {selectedDateEvents.map(evt => (
                    <div key={evt.id} className="p-4 rounded-xl bg-muted cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setSelectedEvent(evt)}>
                      <h4 className="font-semibold text-foreground">{evt.title}</h4>
                      <p className="text-sm text-muted-foreground"><MapPin className="w-3 h-3 inline" /> {evt.location || "TBC"} · <Clock className="w-3 h-3 inline" /> {formatTime(evt.start_datetime)}</p>
                      {evt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>}
                      <div className="flex items-center gap-3 mt-3">
                        <RsvpButton event={evt} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
