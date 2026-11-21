const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER_START = '# @generated begin with-ios-pod-deployment-target';
const MARKER_END = '# @generated end with-ios-pod-deployment-target';

/**
 * Force every CocoaPods target to the app deployment target.
 * Newer Xcode versions reject pod targets below 15.0.
 */
function withIosPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfilePath, 'utf8');

      const snippet = `
    ${MARKER_START}
    deployment_target = podfile_properties['ios.deploymentTarget'] || '15.1'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = deployment_target
      end
    end
    ${MARKER_END}
`;

      // Remove previous injection (if any), then insert before the closing of post_install.
      contents = contents.replace(
        new RegExp(`\\n?[ \\t]*${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g'),
        '\n',
      );

      if (contents.includes(MARKER_START)) {
        return cfg;
      }

      const postInstallEnd = contents.lastIndexOf('  end\nend');
      if (postInstallEnd === -1) {
        throw new Error(
          'with-ios-pod-deployment-target: could not find post_install closing in Podfile',
        );
      }

      contents =
        contents.slice(0, postInstallEnd) + snippet + contents.slice(postInstallEnd);

      await fs.promises.writeFile(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withIosPodDeploymentTarget,
  'with-ios-pod-deployment-target',
  '1.0.0',
);
