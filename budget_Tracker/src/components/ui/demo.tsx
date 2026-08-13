import HeroSection from '@/components/ui/hero-section-9';
import { Users, Briefcase, Link as LinkIcon } from 'lucide-react';

const HeroSectionDemo = () => {
  // Sample data to be passed as props
  const heroData = {
    title: (
      <>
        Every expense is a choice <br /> between today and tomorrow
      </>
    ),
    subtitle: 'Spendzy helps you master your money flow, track daily expenses, and build long-term financial freedom effortlessly.',
    actions: [
      {
        text: 'Start Tracking Free',
        onClick: () => alert('Start Tracking Free clicked!'),
        variant: 'default' as const,
      },
      {
        text: 'Learn more',
        onClick: () => alert('Learn More clicked!'),
        variant: 'outline' as const,
      },
    ],
    stats: [
      {
        value: '50K+',
        label: 'Active Budgeters',
        icon: <Users className="h-5 w-5 text-muted-foreground" />,
      },
      {
        value: '₹120M+',
        label: 'Tracked Monthly',
        icon: <Briefcase className="h-5 w-5 text-muted-foreground" />,
      },
      {
        value: '99.8%',
        label: 'Accuracy',
        icon: <LinkIcon className="h-5 w-5 text-muted-foreground" />,
      },
    ],
    images: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop',
      '/pic1.jpg',
    ],
  };

  return (
    <div className="w-full bg-background">
      <HeroSection
        title={heroData.title}
        subtitle={heroData.subtitle}
        actions={heroData.actions}
        stats={heroData.stats}
        images={heroData.images}
      />
    </div>
  );
};

export default HeroSectionDemo;
