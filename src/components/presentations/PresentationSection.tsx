import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface Section {
  id: number;
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  leftContent?: string;
  rightContent?: string;
  items?: Array<{ title: string; description: string; icon?: string }>;
  metrics?: Array<{ value: string; label: string; change?: string }>;
  timeline?: Array<{ date: string; title: string; description: string }>;
  columns?: Array<{ title: string; items: string[] }>;
  questions?: string[];
  data?: any;
  background?: string;
  accent?: string;
}

interface PresentationSectionProps {
  section: Section;
}

export function PresentationSection({ section }: PresentationSectionProps) {
  const renderContent = () => {
    switch (section.type) {
      case 'hero':
        return (
          <div 
            className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8 py-16"
            style={{ background: section.background || 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)' }}
          >
            <h1 className="text-6xl font-bold text-white mb-6 font-google">
              {section.title}
            </h1>
            {section.subtitle && (
              <p className="text-2xl text-white/90 max-w-3xl font-google">
                {section.subtitle}
              </p>
            )}
          </div>
        );

      case 'content':
        return (
          <div className="max-w-5xl mx-auto px-8 py-12">
            <h2 className="text-4xl font-bold mb-8 font-google" style={{ color: section.accent || 'hsl(var(--primary))' }}>
              {section.title}
            </h2>
            {section.content && (
              <p className="text-lg mb-6 text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            )}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="space-y-4">
                {section.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: section.accent || 'hsl(var(--primary))' }} />
                    <span className="text-lg leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'data-highlight':
        return (
          <div className="max-w-4xl mx-auto px-8 py-16 text-center">
            <h2 className="text-3xl font-bold mb-12 font-google">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {section.metrics?.map((metric, idx) => (
                <Card key={idx} className="p-8 border-2" style={{ borderColor: section.accent || 'hsl(var(--primary))' }}>
                  <div className="text-6xl font-bold mb-4 font-google" style={{ color: section.accent || 'hsl(var(--primary))' }}>
                    {metric.value}
                  </div>
                  <div className="text-lg font-medium mb-2">{metric.label}</div>
                  {metric.change && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-semibold">{metric.change}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="max-w-6xl mx-auto px-8 py-12">
            <h2 className="text-4xl font-bold mb-12 text-center font-google">{section.title}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 border-2 border-destructive/50">
                <div className="text-2xl font-bold mb-6 text-destructive font-google">BEFORE</div>
                <div className="space-y-3 text-muted-foreground">
                  {section.leftContent?.split('\n').map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 mt-0.5 text-destructive flex-shrink-0" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-8 border-2" style={{ borderColor: section.accent || 'hsl(var(--chart-2))' }}>
                <div className="text-2xl font-bold mb-6 font-google" style={{ color: section.accent || 'hsl(var(--chart-2))' }}>AFTER</div>
                <div className="space-y-3">
                  {section.rightContent?.split('\n').map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: section.accent || 'hsl(var(--chart-2))' }} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );

      case 'process-flow':
        return (
          <div className="max-w-6xl mx-auto px-8 py-12">
            <h2 className="text-4xl font-bold mb-12 text-center font-google">{section.title}</h2>
            <div className="space-y-6">
              {section.items?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-6">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(--chart-${(idx % 5) + 1}))` }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 font-google">{item.title}</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                  {idx < (section.items?.length || 0) - 1 && (
                    <ArrowRight className="w-8 h-8 text-muted-foreground/50 flex-shrink-0 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="max-w-6xl mx-auto px-8 py-12">
            <h2 className="text-4xl font-bold mb-12 text-center font-google">{section.title}</h2>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-primary/20" />
              <div className="space-y-8">
                {section.timeline?.map((item, idx) => (
                  <div key={idx} className="relative pl-20">
                    <div 
                      className="absolute left-4 w-9 h-9 rounded-full border-4 border-background flex items-center justify-center font-bold"
                      style={{ backgroundColor: `hsl(var(--chart-${(idx % 5) + 1}))` }}
                    >
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                    <Card className="p-6">
                      <Badge className="mb-3">{item.date}</Badge>
                      <h3 className="text-2xl font-bold mb-2 font-google">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'multi-column':
        return (
          <div className="max-w-6xl mx-auto px-8 py-12">
            <h2 className="text-4xl font-bold mb-12 text-center font-google">{section.title}</h2>
            <div className={`grid gap-6 ${section.columns?.length === 2 ? 'md:grid-cols-2' : section.columns?.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {section.columns?.map((column, idx) => (
                <Card key={idx} className="p-6">
                  <h3 className="text-xl font-bold mb-4 font-google" style={{ color: `hsl(var(--chart-${(idx % 5) + 1}))` }}>
                    {column.title}
                  </h3>
                  <ul className="space-y-2">
                    {column.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-sm leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'question-board':
        return (
          <div className="max-w-4xl mx-auto px-8 py-16">
            <h2 className="text-4xl font-bold mb-12 text-center font-google" style={{ color: section.accent || 'hsl(var(--primary))' }}>
              {section.title}
            </h2>
            <div className="space-y-6">
              {section.questions?.map((question, idx) => (
                <Card key={idx} className="p-6 border-l-4" style={{ borderLeftColor: section.accent || 'hsl(var(--primary))' }}>
                  <p className="text-xl font-medium">{question}</p>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'divider':
        return (
          <div 
            className="py-20 text-center"
            style={{ background: `linear-gradient(135deg, ${section.accent || 'hsl(var(--primary))'} 0%, ${section.background || 'hsl(var(--primary-glow))'} 100%)` }}
          >
            <h2 className="text-5xl font-bold text-white font-google">{section.title}</h2>
          </div>
        );

      default:
        return (
          <div className="max-w-5xl mx-auto px-8 py-12">
            <p className="text-muted-foreground">Unknown section type: {section.type}</p>
          </div>
        );
    }
  };

  return (
    <section id={`section-${section.id}`} className="scroll-mt-20">
      {renderContent()}
    </section>
  );
}
