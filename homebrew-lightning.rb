class LightningCli < Formula
  desc "Lightning CLI - Advanced static analysis and code quality tool powered by small language models"
  homepage "https://github.com/PowerSecure/lightning"
  url "https://github.com/PowerSecure/lightning/releases/download/v1.0.0/lightning-v1.0.0.tar.gz"
  sha256 "placeholder_sha256_hash"  # To be calculated from tarball
  license "ISC"

  depends_on "node" => :optional

  def install
    bin.install "lightning"
    chmod 0755, "#{bin}/lightning"
  end

  test do
    assert_match "lightning@1.0.0", shell_output("#{bin}/lightning --version")
    assert_match "Lightning CLI", shell_output("#{bin}/lightning --help")
  end
end

