const env = {
  demand: (name: string) =>
    process.env[name] ||
    (() => {
      throw new Error(`Environment variable ${name} is not configured`);
    })(),
};

export default env;
