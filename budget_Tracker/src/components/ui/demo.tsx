import HeroSection from '@/components/ui/hero-section-9';
import TextAnimation from '@/components/ui/staggerText';
import { Users, Briefcase, Link as LinkIcon } from 'lucide-react';

interface HeroSectionDemoProps {
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

const HeroSectionDemo = ({ onOpenAuth }: HeroSectionDemoProps) => {
  const heroData = {
    title: (
      <TextAnimation divideBy="word" delay={0.1}>
        Every expense is a choice between today and tomorrow
      </TextAnimation>
    ),
    subtitle: (
      <TextAnimation divideBy="word" delay={0.25}>
        Spendze helps you master your money flow, track daily expenses, and build long-term financial freedom effortlessly.
      </TextAnimation>
    ) as any,
    actions: [
      {
        text: 'Start Tracking Free',
        onClick: () => onOpenAuth ? onOpenAuth('signup') : alert('Start Tracking Free clicked!'),
        variant: 'default' as const,
      },
      {
        text: 'Learn more',
        onClick: () => {
          const el = document.getElementById('features');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        },
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
