import React, { useEffect, useState } from "react";
import { Box, useStdout } from "ink";

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
    const handleResize = () => {
      setDimensions({
        width: process.stdout.columns,
        height: process.stdout.rows,
      });
    };

    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
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
