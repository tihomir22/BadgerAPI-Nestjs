set -ex

USERNAME=sportak777
IMAGE=thepumper

git pull

docker run --rm -v "$PWD":/app sportak777/thepumper patch
version=`cat VERSION`
echo "version: $version"

./build.sh

git add -A
git commit -m "version $version"
git tag -a "$version" -m "version $version"
git push
git push --tags

docker tag $USERNAME/$IMAGE:latest $USERNAME/$IMAGE:$version

docker push $USERNAME/$IMAGE:latest
docker push $USERNAME/$IMAGE:$version

echo "Dembow loco"
