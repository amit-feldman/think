import React, { useEffect, useState } from "react";
import { Box, useStdout } from "ink";

const enterAltScreenCommand = "\x1b[?1049h";
const leaveAltScreenCommand = "\x1b[?1049l";

interface FullScreenProps {
  children: React.ReactNode;
}

export function FullScreen({ children }: FullScreenProps) {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  useEffect(() => {
    // Enter alternate screen buffer (preserves terminal history)
    process.stdout.write(enterAltScreenCommand);

    // Handle resize
    const handleResize = () => {
      setDimensions({
        width: process.stdout.columns,
        height: process.stdout.rows,
      });
    };

    process.stdout.on("resize", handleResize);

    // Cleanup: leave alternate screen buffer
    return () => {
      process.stdout.off("resize", handleResize);
      process.stdout.write(leaveAltScreenCommand);
    };
  }, []);

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      flexDirection="column"
    >
      {children}
    </Box>
  );
}

export function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: process.stdout.columns,
        height: process.stdout.rows,
      });
    };

    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  return size;
}
