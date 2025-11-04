import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SegmentCard {
  title: string;
  percentage: string;
  count: string;
  revenue: string;
  description: string;
  characteristics: string[];
  productFit: { product: string; rating: string }[];
  borderColor: string;
  percentageColor: string;
  revenueColor: string;
}

interface GoogleSlideRendererProps {
  slide: {
    id: number;
    type: 'title' | 'section' | 'content' | 'two-column' | 'cta' | 'segment-grid';
    title?: string;
    subtitle?: string;
    bullets?: string[];
    leftContent?: string;
    rightContent?: string;
    buttonText?: string;
    background?: string;
    accent?: string;
    segments?: SegmentCard[];
  };
}

const getRatingColor = (rating: string) => {
  switch (rating.toLowerCase()) {
    case 'excellent':
      return 'bg-green-500 text-white';
    case 'strong':
      return 'bg-green-400 text-white';
    case 'good':
      return 'bg-yellow-500 text-white';
    case 'moderate':
      return 'bg-blue-500 text-white';
    case 'low':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export function GoogleSlideRenderer({ slide }: GoogleSlideRendererProps) {
  const renderSlideContent = () => {
    switch (slide.type) {
      case 'title':
        return (
          <div 
            className="h-full flex flex-col items-center justify-center text-white p-12"
            style={{ backgroundColor: slide.background || 'var(--google-blue)' }}
          >
            <h1 className="text-6xl font-bold font-google mb-6 text-center">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="text-2xl font-google text-white/90 text-center">
                {slide.subtitle}
              </p>
            )}
          </div>
        );

      case 'section':
        return (
          <div 
            className="h-full flex items-center justify-center p-12"
            style={{ 
              backgroundColor: slide.background || '#fff',
              borderLeft: `12px solid ${slide.accent || 'var(--google-green)'}` 
            }}
          >
            <h2 
              className="text-5xl font-bold font-google"
              style={{ color: slide.accent || 'var(--google-green)' }}
            >
              {slide.title}
            </h2>
          </div>
        );

      case 'content':
        return (
          <div className="h-full bg-white p-12 flex flex-col">
            <h2 
              className="text-4xl font-bold font-google mb-8"
              style={{ color: slide.accent || 'var(--google-blue)' }}
            >
              {slide.title}
            </h2>
            <ul className="space-y-4 flex-1">
              {slide.bullets?.map((bullet, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div 
                    className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: slide.accent || 'var(--google-blue)' }}
                  />
                  <span className="text-2xl font-google text-gray-700 leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'two-column':
        return (
          <div className="h-full bg-white p-12 flex flex-col">
            <h2 
              className="text-4xl font-bold font-google mb-8"
              style={{ color: slide.accent || 'var(--google-blue)' }}
            >
              {slide.title}
            </h2>
            <div className="flex gap-8 flex-1">
              <div className="flex-1 p-6 bg-gray-50 rounded-lg">
                <p className="text-xl font-google text-gray-700">
                  {slide.leftContent}
                </p>
              </div>
              <div className="flex-1 p-6 bg-gray-50 rounded-lg">
                <p className="text-xl font-google text-gray-700">
                  {slide.rightContent}
                </p>
              </div>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div 
            className="h-full flex flex-col items-center justify-center text-white p-12"
            style={{ backgroundColor: slide.background || 'var(--google-red)' }}
          >
            <h2 className="text-5xl font-bold font-google mb-8 text-center">
              {slide.title}
            </h2>
            {slide.buttonText && (
              <button
                className="px-12 py-4 bg-white text-2xl font-bold font-google rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                style={{ color: slide.background || 'var(--google-red)' }}
              >
                {slide.buttonText}
              </button>
            )}
          </div>
        );

      case 'segment-grid':
        return (
          <div className="h-full bg-white p-8 flex flex-col overflow-auto">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold mb-3">
                <span className="text-gray-900">{slide.title?.split(' ').slice(0, -2).join(' ')} </span>
                <span className="text-blue-500">{slide.title?.split(' ').slice(-2).join(' ')}</span>
              </h2>
              {slide.subtitle && (
                <p className="text-lg text-gray-600 max-w-4xl mx-auto">
                  {slide.subtitle}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {slide.segments?.map((segment, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border-t-4 shadow-sm flex flex-col"
                  style={{ borderTopColor: segment.borderColor }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">
                      {segment.title}
                    </h3>
                    <div className="text-right ml-2">
                      <div 
                        className="text-2xl font-bold px-3 py-1 rounded"
                        style={{ 
                          backgroundColor: segment.percentageColor,
                          color: segment.percentageColor.includes('blue') || segment.percentageColor.includes('green') || segment.percentageColor.includes('red') ? 'white' : '#666'
                        }}
                      >
                        {segment.percentage}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{segment.count}</div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <span 
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold border"
                      style={{ 
                        borderColor: segment.revenueColor,
                        color: segment.revenueColor,
                        backgroundColor: `${segment.revenueColor}10`
                      }}
                    >
                      {segment.revenue}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 leading-snug">
                    {segment.description}
                  </p>

                  <div className="mb-2">
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Key Characteristics</h4>
                    <ul className="space-y-0.5">
                      {segment.characteristics.map((char, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="leading-tight">{char}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-2 border-t">
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Product Fit Assessment</h4>
                    <div className="space-y-1">
                      {segment.productFit.map((fit, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{fit.product}</span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${getRatingColor(fit.rating)}`}>
                            {fit.rating}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full bg-white p-12 flex items-center justify-center">
            <p className="text-2xl font-google text-gray-400">Unknown slide type</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full aspect-video overflow-hidden shadow-2xl">
      {renderSlideContent()}
    </Card>
  );
}