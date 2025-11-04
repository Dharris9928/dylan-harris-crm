import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Menu } from 'lucide-react';
import { PresentationSection } from './PresentationSection';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface PresentationWebViewProps {
  sections: any[];
  title?: string;
  onExit?: () => void;
  showNavigation?: boolean;
}

export function PresentationWebView({ sections, title, onExit, showNavigation = true }: PresentationWebViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: number) => {
    const element = document.getElementById(`section-${id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navigationItems = sections
    .filter(s => ['hero', 'divider', 'content'].includes(s.type) && s.title)
    .map(s => ({ id: s.id, title: s.title }));

  return (
    <div className="min-h-screen bg-background">
      {showNavigation && (
        <>
          {/* Fixed Header */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <div className="py-6">
                      <h3 className="font-semibold mb-4 font-google">Navigation</h3>
                      <nav className="space-y-2">
                        {navigationItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className="block w-full text-left px-4 py-2 rounded-md hover:bg-accent transition-colors"
                          >
                            {item.title}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
                <h1 className="font-bold text-lg font-google">{title || 'Presentation'}</h1>
              </div>
              {onExit && (
                <Button variant="ghost" size="icon" onClick={onExit}>
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
            {/* Progress Bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          </header>

          {/* Spacer for fixed header */}
          <div className="h-16" />
        </>
      )}

      {/* Main Content */}
      <main className="relative">
        {sections.map((section) => (
          <PresentationSection key={section.id} section={section} />
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-muted-foreground">
        <p className="text-sm">Generated with Google Nest Pro CRM</p>
      </footer>
    </div>
  );
}
