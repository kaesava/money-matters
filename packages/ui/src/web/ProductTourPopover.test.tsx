import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ProductTourPopover, TourStepConfig } from './ProductTourPopover';
describe('ProductTourPopover', () => {
  const stepConfig: TourStepConfig = {
    step: 1,
    totalSteps: 7,
    titleKey: 'tour.steps.hero.title',
    descKey: 'tour.steps.hero.desc',
    badgeKey: 'tour.steps.hero.badge',
  };

  it('instantiates ProductTourPopover element without errors', () => {
    const element = (
      <ProductTourPopover
        stepConfig={stepConfig}
        targetRect={null}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        isLastStep={false}
      />
    );

    expect(element).toBeTruthy();
    expect(element.props.stepConfig.step).toBe(1);
    expect(element.props.stepConfig.totalSteps).toBe(7);
  });

  it('supports last step configuration', () => {
    const lastStepConfig: TourStepConfig = {
      step: 7,
      totalSteps: 7,
      titleKey: 'tour.steps.ledger.title',
      descKey: 'tour.steps.ledger.desc',
      badgeKey: 'tour.steps.ledger.badge',
    };

    const element = (
      <ProductTourPopover
        stepConfig={lastStepConfig}
        targetRect={null}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        isLastStep={true}
      />
    );

    expect(element.props.isLastStep).toBe(true);
    expect(element.props.stepConfig.step).toBe(7);
  });
});
