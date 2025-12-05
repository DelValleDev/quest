import React from 'react';
import { Text, TextStyle, View, StyleSheet } from 'react-native';

interface SimpleMarkdownProps {
  text: string;
  baseStyle?: TextStyle;
  boldStyle?: TextStyle;
  italicStyle?: TextStyle;
}

/**
 * SimpleMarkdown - Renders basic markdown formatting
 * Supports: **bold**, *italic*, `code`, and line breaks
 */
export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({
  text,
  baseStyle = {},
  boldStyle = {},
  italicStyle = {},
}) => {
  const parseMarkdown = (content: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // Split by line breaks first
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        elements.push(<Text key={`br-${lineIndex}`}>{'\n'}</Text>);
      }
      
      // Parse inline formatting
      const parts = parseInlineFormatting(line, lineIndex);
      elements.push(...parts);
    });
    
    return elements;
  };

  const parseInlineFormatting = (line: string, lineIndex: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // Regex to match **bold**, *italic*, `code`, and numbered lists
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\d+\.\s)/g;
    
    let lastIndex = 0;
    let match;
    let partIndex = 0;
    
    while ((match = regex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = line.substring(lastIndex, match.index);
        elements.push(
          <Text key={`${lineIndex}-text-${partIndex++}`} style={baseStyle}>
            {textBefore}
          </Text>
        );
      }
      
      const matchedText = match[0];
      
      // Check what type of formatting
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        // Bold
        const boldText = matchedText.slice(2, -2);
        elements.push(
          <Text
            key={`${lineIndex}-bold-${partIndex++}`}
            style={[baseStyle, styles.bold, boldStyle]}
          >
            {boldText}
          </Text>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        // Italic
        const italicText = matchedText.slice(1, -1);
        elements.push(
          <Text
            key={`${lineIndex}-italic-${partIndex++}`}
            style={[baseStyle, styles.italic, italicStyle]}
          >
            {italicText}
          </Text>
        );
      } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        // Code
        const codeText = matchedText.slice(1, -1);
        elements.push(
          <Text
            key={`${lineIndex}-code-${partIndex++}`}
            style={[baseStyle, styles.code]}
          >
            {codeText}
          </Text>
        );
      } else if (/^\d+\.\s$/.test(matchedText)) {
        // Numbered list item
        elements.push(
          <Text
            key={`${lineIndex}-list-${partIndex++}`}
            style={[baseStyle, styles.listNumber]}
          >
            {matchedText}
          </Text>
        );
      }
      
      lastIndex = match.index + matchedText.length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      elements.push(
        <Text key={`${lineIndex}-end-${partIndex}`} style={baseStyle}>
          {line.substring(lastIndex)}
        </Text>
      );
    }
    
    // If line was empty, add empty text
    if (elements.length === 0 && line.length === 0) {
      elements.push(<Text key={`${lineIndex}-empty`}>{''}</Text>);
    }
    
    return elements;
  };

  return <Text style={baseStyle}>{parseMarkdown(text)}</Text>;
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  listNumber: {
    fontWeight: '600',
  },
});

export default SimpleMarkdown;
