import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

/** Bootstrap only the isolated local demo database; never the live project. */
const environment = await initializeTestEnvironment({
  projectId: 'demo-personal-website',
  firestore: { host: '127.0.0.1', port: 8080 },
});
try {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'websiteOwners/joshuareisbord@gmail.com'), {
      enabled: true,
    });
  });
  console.log(
    'Local demo owner enabled: joshuareisbord@gmail.com. No production data was changed.',
  );
} finally {
  await environment.cleanup();
}
