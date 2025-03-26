import React from 'react';
import type { ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepProps {
  title: string;
  description?: string;
  isCompleted?: boolean;
  isActive?: boolean;
}

export function Step({ title, description, isCompleted, isActive }: StepProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-center',
          isCompleted && 'bg-primary border-primary text-primary-foreground',
          isActive && !isCompleted && 'border-primary text-primary',
          !isActive &&
            !isCompleted &&
            'border-muted-foreground text-muted-foreground'
        )}
      >
        {isCompleted ? <CheckIcon className="h-4 w-4" /> : null}
      </div>
      <div className="flex flex-col">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

interface StepperProps {
  currentStep: number;
  children: ReactNode;
  className?: string;
}

export function Stepper({ currentStep, children, className }: StepperProps) {
  const steps = Array.isArray(children) ? children : [children];

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          {React.cloneElement(step as React.ReactElement<StepProps>, {
            isCompleted: currentStep > index,
            isActive: currentStep === index,
          })}

          {index < steps.length - 1 && (
            <div className="flex-1 mx-4">
              <div
                className={cn(
                  'h-0.5 w-full bg-muted-foreground/30',
                  currentStep > index && 'bg-primary'
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
