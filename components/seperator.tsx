import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';

interface SeparatorProps {
    /** Height of the separator */
    height?: number;
    /** Width of the separator (use null or '100%' for full width) */
    width?: DimensionValue;
    /** Color of the separator */
    color?: string;
    /** Additional styles for the separator */
    style?: ViewStyle;
    /** Whether the separator is horizontal (true) or vertical (false) */
    horizontal?: boolean;
    /** Margin top and bottom in horizontal mode, or left and right in vertical mode */
    margin?: number;
}

const Separator: React.FC<SeparatorProps> = ({
    height = 1,
    width = '100%',
    color = '#E0E0E0',
    style = {},
    horizontal = true,
    margin = 8,
}) => {
    const separatorStyle = horizontal
        ? {
              height,
              width,
              backgroundColor: color,
              marginVertical: margin,
          }
        : {
              width: height, // For vertical separator, swap height and width
              height: width as number,
              backgroundColor: color,
              marginHorizontal: margin,
          };

    return <View style={[separatorStyle, style]} />;
};

export default Separator;
