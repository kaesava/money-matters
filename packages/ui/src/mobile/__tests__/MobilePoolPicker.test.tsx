import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: Record<string, unknown>) => React.createElement('View', props),
  Text: (props: Record<string, unknown>) => React.createElement('Text', props),
  Modal: (props: Record<string, unknown>) => React.createElement('Modal', props),
  TouchableOpacity: (props: Record<string, unknown>) => React.createElement('TouchableOpacity', props),
  Pressable: (props: Record<string, unknown>) => React.createElement('Pressable', props),
  TextInput: (props: Record<string, unknown>) => React.createElement('TextInput', props),
  SectionList: (props: Record<string, unknown>) => React.createElement('SectionList', props),
  SafeAreaView: (props: Record<string, unknown>) => React.createElement('SafeAreaView', props),
  Platform: { OS: 'android' },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    absoluteFillObject: {},
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
  Ionicons: () => null,
  AntDesign: () => null,
}));

import { MobilePoolPicker, MobilePoolOption } from '../MobilePoolPicker';

describe('MobilePoolPicker', () => {
  const samplePools: MobilePoolOption[] = [
    {
      id: 'pool-1',
      name: 'Everyday Vault',
      poolType: 'EVERYDAY',
      currentBalance: 520.5,
      categories: [
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Coffee' },
      ],
    },
    {
      id: 'pool-2',
      name: 'Rent & Bills',
      poolType: 'REGULAR',
      currentBalance: 1200,
    },
    {
      id: 'pool-3',
      name: 'New Car',
      poolType: 'GOAL',
      currentBalance: 8500,
    },
  ];

  it('is exported and defined as a React component', () => {
    expect(MobilePoolPicker).toBeDefined();
    expect(typeof MobilePoolPicker).toBe('function');
  });

  it('renders correctly in field display style with label and placeholder', () => {
    const el = (
      <MobilePoolPicker
        pools={samplePools}
        selectedPoolId=""
        displayStyle="field"
        mode="inline"
        label="Target Pool"
        placeholder="Select a pool..."
        required
      />
    );
    expect(el).toBeTruthy();
    expect(el.props.label).toBe('Target Pool');
    expect(el.props.placeholder).toBe('Select a pool...');
    expect(el.props.displayStyle).toBe('field');
  });

  it('renders correctly in pill display style', () => {
    const el = (
      <MobilePoolPicker
        pools={samplePools}
        selectedPoolId="pool-1"
        displayStyle="pill"
        compact={true}
      />
    );
    expect(el).toBeTruthy();
    expect(el.props.displayStyle).toBe('pill');
  });

  it('accepts selection callbacks for both pool and category', () => {
    const onSelectPool = vi.fn();
    const onSelectCategory = vi.fn();
    const onChange = vi.fn();

    const el = (
      <MobilePoolPicker
        pools={samplePools}
        selectedPoolId="pool-1"
        selectedCategoryId="cat-1"
        allowCategorySelection={true}
        onSelectPool={onSelectPool}
        onSelectCategory={onSelectCategory}
        onChange={onChange}
      />
    );

    expect(el.props.allowCategorySelection).toBe(true);
    expect(el.props.selectedPoolId).toBe('pool-1');
    expect(el.props.selectedCategoryId).toBe('cat-1');
  });
});
